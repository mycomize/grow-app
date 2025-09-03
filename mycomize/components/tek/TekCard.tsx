import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { Avatar, AvatarFallbackText, AvatarImage } from '~/components/ui/avatar';
import { Alert } from 'react-native';
import { Eye, EllipsisVertical, Users, Lock, Sprout } from 'lucide-react-native';
import { getCachedProfileImage, cacheProfileImage } from '~/lib/imageCache';
import { BulkGrowTek } from '~/lib/types/tekTypes';
import { TekActionSheet } from '~/components/ui/tek-action-sheet';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetIcon,
} from '~/components/ui/actionsheet';
import { AuthContext } from '~/lib/api/AuthContext';
import { formatCount, parseNumberCount } from '~/lib/utils/numberFormatting';
import { useTekById, useLikeTek, useViewTek, useImportTek } from '~/lib/stores/teksStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

interface TekCardProps {
  tek: BulkGrowTek;
  onPress: (tek: BulkGrowTek) => void;
  onUseTek: (tek: BulkGrowTek) => void;
  onDelete: (tek: BulkGrowTek) => void;
  onEdit: (tek: BulkGrowTek) => void;
  onUseForNewGrow: (tek: BulkGrowTek) => void;
  onCopyToNewTek: (tek: BulkGrowTek) => void;
  onTagPress?: (tag: string) => void;
  onRefresh?: () => void; // To refresh parent data after engagement changes
}

export const TekCard: React.FC<TekCardProps> = ({
  tek,
  onDelete,
  onEdit,
  onUseForNewGrow,
  onCopyToNewTek,
  onTagPress,
  onRefresh,
}) => {
  const [cachedImage, setCachedImage] = useState<string | null>(null);
  const [showImportActionSheet, setShowImportActionSheet] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { token } = useContext(AuthContext);
  
  // Get the current tek data from the store (with optimistic updates)
  const currentTek = useTekById(tek.id.toString()) || tek;
  
  // Get engagement actions from store
  const likeTek = useLikeTek();
  const viewTek = useViewTek();
  const importTek = useImportTek();

  // Handle like toggle using store action
  const handleLike = useCallback(async () => {
    if (isLiking || !token) return;
    setIsLiking(true);

    try {
      await likeTek(token, tek.id.toString());
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert(
        'Error',
        'Failed to toggle like. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLiking(false);
    }
  }, [likeTek, tek.id, token, isLiking]);

  // Handle import functionality - shows action sheet with options
  const handleImport = useCallback(() => {
    setShowImportActionSheet(true);
  }, []);

  const handleImportToNewGrow = useCallback(async () => {
    setShowImportActionSheet(false);
    setIsImporting(true);
    
    try {
      // Track the import using store action
      if (token) {
        await importTek(token, tek.id.toString());
      }
      
      // Perform the actual import action
      onUseForNewGrow(currentTek);
    } catch (error) {
      console.error('Error tracking import:', error);
      // Still perform the import action even if tracking fails
      onUseForNewGrow(currentTek);
    } finally {
      setIsImporting(false);
    }
  }, [importTek, onUseForNewGrow, currentTek, token]);

  // Handle owner action sheet
  const handleOwnerActions = useCallback(() => {
    setShowActionSheet(true);
  }, []);

  // Wrapper functions for action sheet handlers
  const handleEditWrapper = useCallback(() => {
    setShowActionSheet(false);
    onEdit(tek);
  }, [onEdit, tek]);

  const handleDeleteWrapper = useCallback(() => {
    setShowActionSheet(false);
    onDelete(tek);
  }, [onDelete, tek]);

  const handleCopyWrapper = useCallback(() => {
    setShowActionSheet(false);
    onCopyToNewTek(tek);
  }, [onCopyToNewTek, tek]);


  // Load cached image for the tek creator
  useEffect(() => {
    const loadCachedImage = async () => {
      if (tek.creator_name) {
        try {
          // First check for cached image
          const cached = await getCachedProfileImage(tek.creator_name);

          if (cached) {
            setCachedImage(cached);
          } else if (tek.creator_profile_image) {
            // If no cached image but we have a profile image from the API, cache it
            await cacheProfileImage(tek.creator_name, tek.creator_profile_image);
            setCachedImage(tek.creator_profile_image);
          }
        } catch (error) {
          console.error('Error loading cached image:', error);
        }
      }
    };

    loadCachedImage();
  }, [tek.creator_name, tek.creator_profile_image]);

  // Get the first two letters of creator name for avatar fallback
  const getCreatorInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  return (
      <>
      <VStack className="border-t border-outline-50 py-4 px-6 bg-background-0 w-full">
        <View>
          {/* Header with tek name and variant/species */}
          {/* Creator info with avatar */}
          <HStack className="mb-5 items-center" space="sm">
            <Avatar size="md">
              {cachedImage || tek.creator_profile_image ? (
                <AvatarImage source={{ uri: cachedImage || tek.creator_profile_image }} />
              ) : (
                <AvatarFallbackText>{getCreatorInitials(tek.creator_name)}</AvatarFallbackText>
              )}
            </Avatar>
            <Text
              className="flex-1 text-lg font-bold text-typography-700"
              numberOfLines={1}
              ellipsizeMode="tail">
              @{tek.creator_name}
            </Text>
            <VStack className="ml-auto">
              {tek.variant && (
                <Text
                  className="text-right text-typography-700"
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {tek.variant}
                </Text>
              )}
              {tek.species && (
                <Text
                  className={
                    tek.variant
                      ? 'text-right italic text-typography-500'
                      : 'text-right text-typography-700'
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {tek.species}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Description */}
          <HStack className="mb-2">
            {tek.name && (
              <Text
                className="text-md ml-0 flex-1 font-semibold text-typography-600"
                numberOfLines={1}
                ellipsizeMode="tail">
                {tek.name}
              </Text>
            )}
            {tek.is_public && (
              <Icon as={Users} className="text-typography-400" />
            )}
            {!tek.is_public && (
              <Icon as={Lock} className="mt-1 text-typography-300" size="md" />
            )}
          </HStack>
          <HStack className="items-center">
            {tek.description && (
              <Text className="text-md mb-2 flex-1 text-typography-600" numberOfLines={6}>
                {tek.description}
              </Text>
            )}
          </HStack>

          {/* Info badge row */}
          <VStack className="mb-2" space="md">
            <HStack space="md">{/* Timeline info removed for now */}</HStack>
          </VStack>

          {/* Tags */}
          {tek.tags && tek.tags.length > 0 && (
            <VStack className="mb-4" space="xs">
              <HStack space="xs" className="flex-wrap items-center">
                {tek.tags.slice(0, 3).map((tag, index) => (
                  <Pressable
                    key={index}
                    onPress={() => onTagPress?.(tag)}
                    className="rounded-md px-0 py-0.5">
                    <Text className="text-md text-blue-400">#{tag}</Text>
                  </Pressable>
                ))}
                {tek.tags.length > 3 && (
                  <Text className="text-xs text-typography-400">+{tek.tags.length - 3} more</Text>
                )}
              </HStack>
            </VStack>
          )}

          {/* Social action controls */}
          <HStack className="mt-1 justify-around" space="md">
            {/* Like Button */}
            <Pressable onPress={handleLike} disabled={isLiking}>
              <HStack className="items-center gap-1 mt-0.5">
                {currentTek.user_has_liked
                 ? <AntDesign name="heart" size={16} color="#ff2400" />
                 : <AntDesign name="hearto" size={16} color="#6c6c6c" />
                }
                {parseNumberCount(currentTek.like_count) > 0 && (
                  <Text className={currentTek.user_has_liked ? "text-sm text-[#ff2400] font-semibold" : "text-sm text-typography-300"}>
                    {formatCount(parseNumberCount(currentTek.like_count))}
                  </Text>
                )}
              </HStack>
            </Pressable>

            {/* Import Button */}
            <Pressable onPress={handleImport} disabled={isImporting}>
              <HStack className="items-center gap-1">
                {currentTek.user_has_imported
                 ? <MaterialCommunityIcons name="mushroom" size={18} color="#4DBE6C" />
                 : <MaterialCommunityIcons name="mushroom-outline" size={20} color="#6c6c6c"/>

                }
                {parseNumberCount(currentTek.import_count) > 0 && (
                  <Text className="text-sm text-[#4DBE6C] font-semibold">
                    {formatCount(parseNumberCount(currentTek.import_count))}
                  </Text>
                )}
              </HStack>
            </Pressable>

            {/* View Count Display */}
            <HStack className="items-center gap-1">
              <Icon className="text-typography-300" as={Eye} size="md" />
              {parseNumberCount(currentTek.view_count) > 0 && (
                <Text className="text-sm text-typography-300">
                  {formatCount(parseNumberCount(currentTek.view_count))}
                </Text>
              )}
            </HStack>

            {/* Owner Actions - Only show if user owns this tek */}
            {tek.is_owner && (
              <Pressable onPress={handleOwnerActions}>
                <Icon className="text-typography-300" as={EllipsisVertical} size="md" />
              </Pressable>
            )}
          </HStack>
        </View>
      </VStack>

      {/* Import Action Sheet - Simple action sheet for importing tek */}
      <Actionsheet isOpen={showImportActionSheet} onClose={() => setShowImportActionSheet(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          
          <ActionsheetItem onPress={handleImportToNewGrow}>
            <MaterialCommunityIcons name="mushroom-outline" size={22} color="#6c6c6c" />
            <ActionsheetItemText className="text-xl font-semibold ml-1">Import to new grow</ActionsheetItemText>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>

      {/* Owner Action Sheet - Only render if user owns this tek */}
      {tek.is_owner && (
        <TekActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          onEdit={handleEditWrapper}
          onDelete={handleDeleteWrapper}
          onCopy={handleCopyWrapper}
          isOwner={tek.is_owner}
          tekName={tek.name}
          isDeleting={false}
        />
      )}
   </>
  );
};
