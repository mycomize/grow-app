import { Platform } from 'react-native';

// Define API URL based on platform
const API_URL = Platform.select({
  web: 'http://localhost:8000',
  default: 'http://10.0.2.2:8000', // For Android emulator
});

// Type definitions for Grow
export interface Grow {
  id: number;
  species: string;
  variant: string;
  inoculation_date: string; // ISO format date
  spawn_substrate: string;
  bulk_substrate: string;
  user_id: number;
}

export interface CreateGrowData {
  species: string;
  variant: string;
  inoculation_date: string; // ISO format date
  spawn_substrate: string;
  bulk_substrate: string;
}

// API functions for Grow
export const growApi = {
  // Get all grows for the current user
  async getGrows(token: string): Promise<Grow[]> {
    const response = await fetch(`${API_URL}/grows/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch grows');
    }

    return response.json();
  },

  // Get a specific grow by ID
  async getGrow(token: string, growId: number): Promise<Grow> {
    const response = await fetch(`${API_URL}/grows/${growId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch grow');
    }

    return response.json();
  },

  // Create a new grow
  async createGrow(token: string, growData: CreateGrowData): Promise<Grow> {
    const response = await fetch(`${API_URL}/grows/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(growData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create grow');
    }

    return response.json();
  },

  // Update a grow
  async updateGrow(
    token: string,
    growId: number,
    growData: Partial<CreateGrowData>
  ): Promise<Grow> {
    const response = await fetch(`${API_URL}/grows/${growId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(growData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update grow');
    }

    return response.json();
  },

  // Delete a grow
  async deleteGrow(token: string, growId: number): Promise<void> {
    const response = await fetch(`${API_URL}/grows/${growId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete grow');
    }
  },
};
