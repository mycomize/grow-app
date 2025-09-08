#!/usr/bin/env python3
"""
Database inspection script for Mycomize SQLite database.
This script allows you to inspect the raw database contents to verify encryption is working properly.
"""

import sqlite3
import sys
import argparse
from typing import Dict, List, Any 
from datetime import datetime

# Encryption prefixes/patterns to identify encrypted fields
ENCRYPTION_INDICATORS = [
    'enc_v1:',  # Versioned encryption prefix
]

def connect_to_database(db_path: str = "./backend/data/mycomize.db") -> sqlite3.Connection:
    """Connect to the SQLite database."""
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # This makes rows accessible by column name
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def get_table_names(conn: sqlite3.Connection) -> List[str]:
    """Get all table names in the database."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    return [row[0] for row in cursor.fetchall()]

def get_table_schema(conn: sqlite3.Connection, table_name: str) -> List[Dict[str, Any]]:
    """Get the schema information for a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = []
    for row in cursor.fetchall():
        columns.append({
            'name': row[1],
            'type': row[2],
            'not_null': row[3],
            'default': row[4],
            'primary_key': row[5]
        })
    return columns

def is_likely_encrypted(value: str) -> bool:
    """Check if a string value appears to be encrypted."""
    if not isinstance(value, str) or len(value) < 10:
        return False
    
    # Check for encryption prefixes
    for indicator in ENCRYPTION_INDICATORS:
        if value.startswith(indicator):
            return True
    
    # Check if it looks like base64 (common in encryption)
    # Base64 encoded strings are typically longer and contain specific characters
    if len(value) > 20 and all(c.isalnum() or c in '+/=' for c in value):
        # Additional heuristic: if it's very long and looks random, likely encrypted
        if len(value) > 50:
            return True
    
    return False

def format_field_value(value: Any, max_length: int = 50) -> str:
    """Format a field value for display, truncating long values."""
    if value is None:
        return "NULL"
    
    str_value = str(value)
    if len(str_value) <= max_length:
        return str_value
    
    return str_value[:max_length] + "..."

def analyze_encryption_status(row: sqlite3.Row) -> Dict[str, str]:
    """Analyze which fields in a row appear to be encrypted."""
    analysis = {}
    for key in row.keys():
        value = row[key]
        if isinstance(value, str):
            if is_likely_encrypted(value):
                analysis[key] = "[ENCRYPTED]"
            else:
                analysis[key] = "[CLEARTEXT]"
        elif value is None:
            analysis[key] = "[NULL]"
        else:
            analysis[key] = f"[{type(value).__name__.upper()}]"
    return analysis

def list_users(conn: sqlite3.Connection) -> None:
    """List all users in the database."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, is_active, created_at, profile_image FROM users ORDER BY id;")
    
    print("\n=== USERS ===")
    print(f"{'ID':<5} {'Username':<20} {'Active':<8} {'Created':<20} {'Profile Image':<15}")
    print("-" * 80)
    
    for row in cursor.fetchall():
        profile_status = "[ENCRYPTED]" if row[4] and is_likely_encrypted(row[4]) else "[CLEARTEXT]" if row[4] else "[NULL]"
        print(f"{row[0]:<5} {row[1]:<20} {row[2]:<8} {row[3]:<20} {profile_status:<15}")

def inspect_user_profile(conn: sqlite3.Connection, user_id: int = None) -> None:
    """Inspect user profile data specifically."""
    print("\n=== USER PROFILE INSPECTION ===")
    
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        users = [cursor.fetchone()]
    else:
        cursor.execute("SELECT * FROM users ORDER BY id;")
        users = cursor.fetchall()
    
    if not users or (len(users) == 1 and users[0] is None):
        print("No users found.")
        return
    
    for user in users:
        if user is None:
            continue
            
        print(f"\n** User {user['id']} (@{user['username']}) **")
        analysis = analyze_encryption_status(user)
        
        # Show profile image status specifically
        if user['profile_image']:
            profile_status = analysis.get('profile_image', '[UNKNOWN]')
            print(f"  Profile Image Status: {profile_status}")
            print(f"  Profile Image Length: {len(user['profile_image'])} characters")
            print(f"  Profile Image Preview: {format_field_value(user['profile_image'], 50)}")
        else:
            print(f"  Profile Image: [NULL]")
        
        # Show other user fields
        print(f"  Username: {user['username']} (unencrypted)")
        print(f"  Active: {user['is_active']}")
        print(f"  Created: {user['created_at']}")
        print(f"  Updated: {user['updated_at']}")

def get_system_fields() -> List[str]:
    """Get list of fields that should be system fields (not encrypted).
    
    These are fields defined with specific SQLAlchemy types (Integer, Boolean, DateTime, String)
    rather than Text type. Fields defined as Text are encrypted user data.
    """
    return [
        # Primary keys
        'id',
        # Foreign keys  
        'user_id', 'bulk_grow_id', 'gateway_id', 'created_by', 'linked_grow_id', 'tek_id',
        'parent_task_id', 'grow_id',
        # System timestamps
        'created_at', 'updated_at',
        # System flags and counters
        'is_active', 'is_public', 'usage_count',
        # Authentication fields
        'username', 'hashed_password'
    ]

def get_expected_model_fields() -> Dict[str, Dict[str, List[str]]]:
    """Get expected field categorization for each model based on current backend models.
    
    Returns:
        Dict mapping table names to dict of field categories (system vs user_data)
    """
    return {
        'users': {
            'system': ['id', 'username', 'hashed_password', 'is_active', 'created_at', 'updated_at'],
            'user_data': ['profile_image']  # Text field, encrypted
        },
        'bulk_grows': {
            'system': ['id', 'user_id'],
            'user_data': [
                'name', 'description', 'species', 'variant', 'location', 'tags',
                'inoculation_date', 'inoculation_status', 'spawn_start_date', 
                'spawn_colonization_status', 'bulk_start_date', 'bulk_colonization_status',
                'fruiting_start_date', 'fruiting_status', 'full_spawn_colonization_date',
                'full_bulk_colonization_date', 'fruiting_pin_date', 's2b_ratio', 
                'current_stage', 'status', 'total_cost', 'stages'
            ]
        },
        'flushes': {
            'system': ['id', 'bulk_grow_id'],
            'user_data': ['harvest_date', 'wet_yield_grams', 'dry_yield_grams', 'concentration_mg_per_gram']
        },
        'bulk_grow_teks': {
            'system': ['id', 'created_by', 'is_public'],
            'user_data': ['name', 'description', 'species', 'variant', 'tags', 'stages', 'like_count', 'view_count', 'import_count']
        },
        'iot_gateways': {
            'system': ['id', 'user_id'],
            'user_data': ['name', 'type', 'description', 'api_url', 'api_key', 'linked_entities_count', 'linkable_entities_count']
        },
        'iot_entities': {
            'system': ['id', 'gateway_id', 'linked_grow_id'],
            'user_data': ['entity_name', 'entity_type', 'friendly_name', 'domain', 'device_class', 'linked_stage']
        },
        'tek_likes': {
            'system': ['id', 'tek_id', 'user_id', 'created_at'],
            'user_data': []  # No encrypted user data fields
        },
        'tek_views': {
            'system': ['id', 'tek_id', 'user_id', 'created_at'],
            'user_data': []  # No encrypted user data fields
        },
        'tek_imports': {
            'system': ['id', 'tek_id', 'user_id', 'created_at'],
            'user_data': []  # No encrypted user data fields
        },
        'calendar_tasks': {
            'system': ['id', 'parent_task_id', 'grow_id', 'created_at', 'updated_at'],
            'user_data': ['action', 'stage_key', 'date', 'time', 'status']
        }
    }

def validate_model_synchronization(conn: sqlite3.Connection) -> None:
    """Validate that the database schema matches expected model structure."""
    print("\n=== MODEL SYNCHRONIZATION VALIDATION ===")
    
    expected_fields = get_expected_model_fields()
    
    for table_name, expected in expected_fields.items():
        try:
            schema = get_table_schema(conn, table_name)
            if not schema:
                print(f"[ERROR] {table_name.upper()}: Table not found")
                continue
                
            actual_fields = [col['name'] for col in schema]
            all_expected_fields = set(expected['system'] + expected['user_data'])
            actual_fields_set = set(actual_fields)
            
            # Check for missing fields
            missing = all_expected_fields - actual_fields_set
            # Check for unexpected fields  
            unexpected = actual_fields_set - all_expected_fields
            
            if not missing and not unexpected:
                print(f"[OK] {table_name.upper()}: Schema synchronized")
            else:
                print(f"[WARNING] {table_name.upper()}: Schema differences detected")
                if missing:
                    print(f"   Missing fields: {', '.join(sorted(missing))}")
                if unexpected:
                    print(f"   Unexpected fields: {', '.join(sorted(unexpected))}")
            
            # Check field types for user data (should be TEXT for encryption)
            text_fields = [col['name'] for col in schema if col['type'].upper() == 'TEXT']
            non_text_user_fields = [f for f in expected['user_data'] if f not in text_fields and f in actual_fields_set]
            
            if non_text_user_fields:
                print(f"   [WARNING] Non-TEXT user data fields: {', '.join(non_text_user_fields)} (encryption may not work)")
            
            # Report field counts
            system_count = len([f for f in expected['system'] if f in actual_fields_set])
            user_data_count = len([f for f in expected['user_data'] if f in actual_fields_set])
            print(f"   System fields: {system_count}, User data fields: {user_data_count}")
            
        except sqlite3.Error as e:
            print(f"[ERROR] {table_name.upper()}: Database error - {e}")

def categorize_fields(row: sqlite3.Row) -> Dict[str, List[str]]:
    """Categorize fields into system vs user data fields."""
    system_fields = get_system_fields()
    
    categorized = {
        'system': [],
        'user_data': []
    }
    
    for field_name in row.keys():
        if field_name in system_fields:
            categorized['system'].append(field_name)
        else:
            categorized['user_data'].append(field_name)
    
    return categorized

def inspect_user_data(conn: sqlite3.Connection, user_id: int) -> None:
    """Inspect all data for a specific user."""
    print(f"\n=== USER {user_id} DATA INSPECTION ===")
    
    # Check if user exists
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        print(f"User with ID {user_id} not found.")
        return
    
    print(f"Username: {user[0]}")
    
    # Inspect BulkGrows
    print(f"\n--- BulkGrows for User {user_id} ---")
    cursor.execute("SELECT * FROM bulk_grows WHERE user_id = ? ORDER BY id;", (user_id,))
    grows = cursor.fetchall()
    
    if not grows:
        print("No grows found for this user.")
    else:
        for i, grow in enumerate(grows):
            print(f"\n** Grow {grow['id']} **")
            analysis = analyze_encryption_status(grow)
            categorized = categorize_fields(grow)
            
            # Show user data fields first (these should be encrypted)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(grow[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(grow[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Inspect Flushes
    print(f"\n--- Flushes for User {user_id} ---")
    cursor.execute("""
        SELECT f.* FROM flushes f 
        JOIN bulk_grows bg ON f.bulk_grow_id = bg.id 
        WHERE bg.user_id = ? ORDER BY f.id;
    """, (user_id,))
    flushes = cursor.fetchall()
    
    if not flushes:
        print("No flushes found for this user.")
    else:
        for flush in flushes:
            print(f"\n** Flush {flush['id']} (Grow {flush['bulk_grow_id']}) **")
            analysis = analyze_encryption_status(flush)
            categorized = categorize_fields(flush)
            
            # Show user data fields first (these should be encrypted)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(flush[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(flush[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Inspect TEKs (Bulk Grow Teks)
    print(f"\n--- TEKs for User {user_id} ---")
    cursor.execute("SELECT * FROM bulk_grow_teks WHERE created_by = ? ORDER BY id;", (user_id,))
    teks = cursor.fetchall()
    
    if not teks:
        print("No TEKs found for this user.")
    else:
        for tek in teks:
            print(f"\n** TEK {tek['id']} **")
            analysis = analyze_encryption_status(tek)
            categorized = categorize_fields(tek)
            
            # Show user data fields first (these should be encrypted unless is_public=True)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(tek[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    # Note if this is a public TEK
                    try:
                        public_note = " (PUBLIC TEK)" if tek['is_public'] else ""
                    except (KeyError, IndexError):
                        public_note = ""
                    print(f"    {field:25}: {status:15} | {value}{public_note}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(tek[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Inspect IoT Gateways
    print(f"\n--- IoT Gateways for User {user_id} ---")
    cursor.execute("SELECT * FROM iot_gateways WHERE user_id = ? ORDER BY id;", (user_id,))
    gateways = cursor.fetchall()
    
    if not gateways:
        print("No IoT Gateways found for this user.")
    else:
        for gateway in gateways:
            print(f"\n** IoT Gateway {gateway['id']} **")
            analysis = analyze_encryption_status(gateway)
            categorized = categorize_fields(gateway)
            
            # Show user data fields first (these should be encrypted)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(gateway[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(gateway[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Inspect IoT Entities
    print(f"\n--- IoT Entities for User {user_id} ---")
    cursor.execute("""
        SELECT e.* FROM iot_entities e 
        JOIN iot_gateways g ON e.gateway_id = g.id 
        WHERE g.user_id = ? ORDER BY e.id;
    """, (user_id,))
    entities = cursor.fetchall()
    
    if not entities:
        print("No IoT Entities found for this user.")
    else:
        for entity in entities:
            print(f"\n** IoT Entity {entity['id']} (Gateway {entity['gateway_id']}) **")
            analysis = analyze_encryption_status(entity)
            categorized = categorize_fields(entity)
            
            # Show user data fields first (these should be encrypted)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(entity[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(entity[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Inspect TEK Engagement Data
    print(f"\n--- TEK Engagement for User {user_id} ---")
    
    # TEK Likes
    cursor.execute("SELECT * FROM tek_likes WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;", (user_id,))
    likes = cursor.fetchall()
    if likes:
        print(f"\n** TEK Likes ({len(likes)} shown, most recent first) **")
        for like in likes:
            analysis = analyze_encryption_status(like)
            print(f"  TEK {like['tek_id']:3} | ID: {like['id']:3} | {like['created_at']}")
    else:
        print("\n** TEK Likes: None found **")
    
    # TEK Views  
    cursor.execute("SELECT * FROM tek_views WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;", (user_id,))
    views = cursor.fetchall()
    if views:
        print(f"\n** TEK Views ({len(views)} shown, most recent first) **")
        for view in views:
            analysis = analyze_encryption_status(view)
            print(f"  TEK {view['tek_id']:3} | ID: {view['id']:3} | {view['created_at']}")
    else:
        print("\n** TEK Views: None found **")
    
    # TEK Imports
    cursor.execute("SELECT * FROM tek_imports WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;", (user_id,))
    imports = cursor.fetchall()
    if imports:
        print(f"\n** TEK Imports ({len(imports)} shown, most recent first) **")
        for import_record in imports:
            analysis = analyze_encryption_status(import_record)
            print(f"  TEK {import_record['tek_id']:3} | ID: {import_record['id']:3} | {import_record['created_at']}")
    else:
        print("\n** TEK Imports: None found **")
    
    # Inspect Calendar Tasks
    print(f"\n--- Calendar Tasks for User {user_id} ---")
    cursor.execute("""
        SELECT ct.* FROM calendar_tasks ct 
        JOIN bulk_grows bg ON ct.grow_id = bg.id 
        WHERE bg.user_id = ? ORDER BY ct.date DESC, ct.id DESC;
    """, (user_id,))
    calendar_tasks = cursor.fetchall()
    
    if not calendar_tasks:
        print("No calendar tasks found for this user.")
    else:
        for task in calendar_tasks:
            print(f"\n** Calendar Task {task['id']} (Grow {task['grow_id']}) **")
            analysis = analyze_encryption_status(task)
            categorized = categorize_fields(task)
            
            # Show user data fields first (these should be encrypted)
            if categorized['user_data']:
                print("  USER DATA FIELDS:")
                for field in sorted(categorized['user_data']):
                    value = format_field_value(task[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
            
            # Show system fields (these should be cleartext)
            if categorized['system']:
                print("  SYSTEM FIELDS:")
                for field in sorted(categorized['system']):
                    value = format_field_value(task[field])
                    status = analysis.get(field, "[UNKNOWN]")
                    print(f"    {field:25}: {status:15} | {value}")
    
    # Show engagement summary for this user
    print(f"\n--- Engagement Summary for User {user_id} ---")
    try:
        like_count = cursor.execute("SELECT COUNT(*) FROM tek_likes WHERE user_id = ?", (user_id,)).fetchone()[0]
        view_count = cursor.execute("SELECT COUNT(*) FROM tek_views WHERE user_id = ?", (user_id,)).fetchone()[0] 
        import_count = cursor.execute("SELECT COUNT(*) FROM tek_imports WHERE user_id = ?", (user_id,)).fetchone()[0]
        
        # Calendar tasks summary
        try:
            calendar_tasks_count = cursor.execute("""
                SELECT COUNT(*) FROM calendar_tasks ct 
                JOIN bulk_grows bg ON ct.grow_id = bg.id 
                WHERE bg.user_id = ?
            """, (user_id,)).fetchone()[0]
            pending_tasks = cursor.execute("""
                SELECT COUNT(*) FROM calendar_tasks ct 
                JOIN bulk_grows bg ON ct.grow_id = bg.id 
                WHERE bg.user_id = ? AND ct.status != 'completed'
            """, (user_id,)).fetchone()[0]
            completed_tasks = cursor.execute("""
                SELECT COUNT(*) FROM calendar_tasks ct 
                JOIN bulk_grows bg ON ct.grow_id = bg.id 
                WHERE bg.user_id = ? AND ct.status = 'completed'
            """, (user_id,)).fetchone()[0]
            print(f"  Total Calendar Tasks: {calendar_tasks_count} (Pending: {pending_tasks}, Completed: {completed_tasks})")
        except sqlite3.Error:
            pass  # Table might not exist yet
        
        print(f"  Total Likes: {like_count}")
        print(f"  Total Views: {view_count}")
        print(f"  Total Imports: {import_count}")
    except sqlite3.Error as e:
        print(f"  Error calculating engagement summary: {e}")

def inspect_table_raw(conn: sqlite3.Connection, table_name: str, limit: int = 10) -> None:
    """Show raw data from a table."""
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit};")
    rows = cursor.fetchall()
    
    if not rows:
        print(f"No data found in table '{table_name}'.")
        return
    
    print(f"\n=== RAW DATA: {table_name.upper()} (showing {len(rows)} rows) ===")
    
    # Get column names
    columns = [description[0] for description in cursor.description]
    
    for i, row in enumerate(rows):
        print(f"\n** Row {i + 1} **")
        analysis = analyze_encryption_status(row)
        
        for col_name in columns:
            value = format_field_value(row[col_name], max_length=80)
            status = analysis.get(col_name, "[UNKNOWN]")
            print(f"  {col_name:20}: {status:15} | {value}")

def show_encryption_summary(conn: sqlite3.Connection) -> None:
    """Show a summary of encryption status across all tables."""
    print("\n=== ENCRYPTION SUMMARY ===")
    
    tables_to_check = ['users', 'bulk_grows', 'flushes', 'bulk_grow_teks', 'iot_gateways', 'iot_entities', 'tek_likes', 'tek_views', 'tek_imports', 'calendar_tasks']
    
    for table_name in tables_to_check:
        cursor = conn.cursor()
        try:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
            rows = cursor.fetchall()
            
            if not rows:
                print(f"{table_name}: No data")
                continue
            
            print(f"\n{table_name.upper()}:")
            
            # Analyze first row to get field encryption status
            if rows:
                analysis = analyze_encryption_status(rows[0])
                encrypted_fields = [k for k, v in analysis.items() if "ENCRYPTED" in v]
                cleartext_fields = [k for k, v in analysis.items() if "CLEARTEXT" in v]
                
                print(f"  [ENCRYPTED] fields: {', '.join(encrypted_fields) if encrypted_fields else 'None'}")
                print(f"  [CLEARTEXT] fields: {', '.join(cleartext_fields) if cleartext_fields else 'None'}")
                print(f"  [ROWS] Total rows: {len(rows)}")
                
                # Special note for TEKs about public vs private
                if table_name == 'bulk_grow_teks':
                    try:
                        if 'is_public' in rows[0].keys():
                            public_count = cursor.execute("SELECT COUNT(*) FROM bulk_grow_teks WHERE is_public = 1").fetchone()[0]
                            private_count = cursor.execute("SELECT COUNT(*) FROM bulk_grow_teks WHERE is_public = 0").fetchone()[0]
                            print(f"  [TEKS] Public TEKs: {public_count}, Private TEKs: {private_count}")
                    except (KeyError, IndexError):
                        pass
                
                # Special notes for engagement tables
                if table_name in ['tek_likes', 'tek_views', 'tek_imports']:
                    try:
                        total_count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
                        unique_users = cursor.execute(f"SELECT COUNT(DISTINCT user_id) FROM {table_name}").fetchone()[0]
                        unique_teks = cursor.execute(f"SELECT COUNT(DISTINCT tek_id) FROM {table_name}").fetchone()[0]
                        print(f"  [ENGAGEMENT] Total: {total_count}, Users: {unique_users}, TEKs: {unique_teks}")
                    except (KeyError, IndexError, sqlite3.Error):
                        pass
        
        except sqlite3.Error as e:
            print(f"{table_name}: Error - {e}")

def main():
    parser = argparse.ArgumentParser(description="Inspect Mycomize SQLite database for encryption verification")
    parser.add_argument("--db", default="./backend/data/mycomize.db", help="Path to SQLite database file")
    parser.add_argument("--list-users", action="store_true", help="List all users")
    parser.add_argument("--user-profile", type=int, nargs='?', const=0, help="Inspect user profile data (all users if no ID given)")
    parser.add_argument("--user", type=int, help="Inspect data for specific user ID")
    parser.add_argument("--table", help="Show raw data from specific table")
    parser.add_argument("--limit", type=int, default=10, help="Limit number of rows to show")
    parser.add_argument("--summary", action="store_true", help="Show encryption summary")
    parser.add_argument("--tables", action="store_true", help="List all tables")
    parser.add_argument("--validate", action="store_true", help="Validate database schema against expected models")
    
    args = parser.parse_args()
    
    # Connect to database
    conn = connect_to_database(args.db)
    
    try:
        if args.tables:
            tables = get_table_names(conn)
            print("Available tables:")
            for table in tables:
                print(f"  - {table}")
        
        elif args.list_users:
            list_users(conn)
        
        elif args.user_profile is not None:
            if args.user_profile == 0:
                inspect_user_profile(conn)  # All users
            else:
                inspect_user_profile(conn, args.user_profile)  # Specific user
        
        elif args.user:
            inspect_user_data(conn, args.user)
        
        elif args.table:
            inspect_table_raw(conn, args.table, args.limit)
        
        elif args.summary:
            show_encryption_summary(conn)
        
        elif args.validate:
            validate_model_synchronization(conn)
        
        else:
            # Default: show validation and summary
            print("Mycomize Database Inspector")
            print("=" * 50)
            validate_model_synchronization(conn)
            show_encryption_summary(conn)
            list_users(conn)
            print("\nUsage examples:")
            print(f"  python {sys.argv[0]} --user 1                    # Inspect user 1 data")
            print(f"  python {sys.argv[0]} --table bulk_grows          # Show bulk_grows table")
            print(f"  python {sys.argv[0]} --summary                   # Show encryption summary")
            print(f"  python {sys.argv[0]} --validate                  # Validate model synchronization")
            print(f"  python {sys.argv[0]} --list-users                # List all users")
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()
