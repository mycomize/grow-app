import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Button, ButtonText } from '~/components/ui/button';
import {
  Popover,
  PopoverBackdrop,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
} from '~/components/ui/popover';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { Avatar, AvatarFallbackText, AvatarImage } from '~/components/ui/avatar';
import { Alert } from 'react-native';
import { RefreshCw, Clock, Eye, Users, Tag, Trash2, Lock, SquarePen } from 'lucide-react-native';
import { InfoBadge } from '~/components/ui/info-badge';
import { getCachedProfileImage, cacheProfileImage } from '~/lib/imageCache';
import { MonotubTekTemplate } from '~/lib/templateTypes';
import { TemplateActionModal } from '~/components/template/modals/TemplateActionModal';

interface TemplateCardProps {
  template: MonotubTekTemplate;
  onPress: (template: MonotubTekTemplate) => void;
  onUseTemplate: (template: MonotubTekTemplate) => void;
  onDelete: (template: MonotubTekTemplate) => void;
  onEdit: (template: MonotubTekTemplate) => void;
  onConvertToGrow: (template: MonotubTekTemplate) => void;
  onUseForNewGrow: (template: MonotubTekTemplate) => void;
  onCopyToNewTek: (template: MonotubTekTemplate) => void;
  onTagPress?: (tag: string) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPress,
  onUseTemplate,
  onDelete,
  onEdit,
  onConvertToGrow,
  onUseForNewGrow,
  onCopyToNewTek,
  onTagPress,
}) => {
  const [cachedImage, setCachedImage] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const handlePopoverOpen = () => {
    setShowPopover(true);
  };

  const handlePopoverClose = () => {
    setShowPopover(false);
  };

  // Handle delete confirmation with React Native Alert
  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(template),
        },
      ],
      { cancelable: true }
    );
  }, [template, onDelete]);

  // Load cached image for the template creator
  useEffect(() => {
    const loadCachedImage = async () => {
      if (template.created_by) {
        try {
          // First check for cached image
          const cached = await getCachedProfileImage(template.created_by.toString());

          if (cached) {
            setCachedImage(cached);
          } else if (template.creator_profile_image) {
            // If no cached image but we have a profile image from the API, cache it
            await cacheProfileImage(template.created_by.toString(), template.creator_profile_image);
            setCachedImage(template.creator_profile_image);
          }
        } catch (error) {
          console.error('Error loading cached image:', error);
        }
      }
    };

    loadCachedImage();
  }, [template.created_by, template.creator_profile_image]);

  // Get the first two letters of creator name for avatar fallback
  const getCreatorInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  return (
    <Card className="w-11/12 rounded-xl bg-background-0 p-2">
      <VStack className="p-2">
        <View>
          {/* Header with template name and variant/species */}
          {/* Creator info with avatar */}
          <HStack className="mb-5 items-center" space="sm">
            <Avatar size="md">
              {cachedImage || template.creator_profile_image ? (
                <AvatarImage source={{ uri: cachedImage || template.creator_profile_image }} />
              ) : (
                <AvatarFallbackText>{getCreatorInitials(template.creator_name)}</AvatarFallbackText>
              )}
            </Avatar>
            <Text
              className="flex-1 text-lg font-bold text-typography-700"
              numberOfLines={1}
              ellipsizeMode="tail">
              @{template.creator_name}
            </Text>
            <VStack className="ml-auto">
              {template.variant && (
                <Text
                  className="text-right text-typography-700"
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {template.variant}
                </Text>
              )}
              {template.species && (
                <Text
                  className={
                    template.variant
                      ? 'text-right italic text-typography-500'
                      : 'text-right text-typography-700'
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {template.species}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Description */}
          <HStack className="mb-2">
            {template.is_public && (
              <Popover
                isOpen={showPopover}
                onClose={handlePopoverClose}
                onOpen={handlePopoverOpen}
                shouldFlip={true}
                placement={'bottom right'}
                size="md"
                trigger={(triggerProps) => {
                  return (
                    <Pressable {...triggerProps}>
                      <Icon as={Users} className="mt-1 text-typography-300" size="md" />
                    </Pressable>
                  );
                }}>
                <PopoverBackdrop />
                <PopoverContent>
                  <PopoverBody>
                    <Text className="text-sm text-typography-500">
                      This tek is public and can be viewd and used by other users.
                    </Text>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}
            {!template.is_public && (
              <Popover
                isOpen={showPopover}
                onClose={handlePopoverClose}
                onOpen={handlePopoverOpen}
                shouldFlip={true}
                placement={'bottom right'}
                size="md"
                trigger={(triggerProps) => {
                  return (
                    <Pressable {...triggerProps}>
                      <Icon as={Lock} className="mt-1 text-typography-300" size="md" />
                    </Pressable>
                  );
                }}>
                <PopoverBackdrop />
                <PopoverContent>
                  <PopoverBody>
                    <Text className="text-sm text-typography-500">
                      This tek is private and can only be viewed and used by you.
                    </Text>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}
            {template.name && (
              <Text
                className="text-md ml-2 mt-1 flex-1 font-semibold text-typography-600"
                numberOfLines={1}
                ellipsizeMode="tail">
                {template.name}
              </Text>
            )}
            <InfoBadge className="" text={template.type.toLowerCase()} variant="info" size="md" />
          </HStack>
          <HStack className="items-center">
            {template.description && (
              <Text className="text-md mb-2 flex-1 text-typography-600" numberOfLines={6}>
                {template.description}
              </Text>
            )}
          </HStack>

          {/* Info badge row */}
          <VStack className="mb-2" space="md">
            <HStack space="md">{/* Timeline info removed for now */}</HStack>
          </VStack>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <VStack className="mb-4" space="xs">
              <HStack space="xs" className="flex-wrap items-center">
                {template.tags.slice(0, 3).map((tag, index) => (
                  <Pressable
                    key={index}
                    onPress={() => onTagPress?.(tag)}
                    className="rounded-md px-0 py-0.5">
                    <Text className="text-md text-blue-400">#{tag}</Text>
                  </Pressable>
                ))}
                {template.tags.length > 3 && (
                  <Text className="text-xs text-typography-400">
                    +{template.tags.length - 3} more
                  </Text>
                )}
              </HStack>
            </VStack>
          )}

          {/* Action controls */}
          <HStack className="mt-1 justify-around" space="md">
            <Pressable onPress={() => setShowActionModal(true)}>
              <HStack className="items-center gap-1">
                <Icon className="text-typography-300" as={RefreshCw} size="md" />
                {template.usage_count > 0 && (
                  <Text className="text-sm text-typography-300">{template.usage_count}</Text>
                )}
              </HStack>
            </Pressable>
            <Pressable onPress={() => onEdit(template)}>
              <Icon className="text-typography-300" as={SquarePen} size="md" />
            </Pressable>
            <Pressable onPress={handleDeletePress}>
              <Icon className="text-typography-300" as={Trash2} size="md" />
            </Pressable>
          </HStack>
        </View>
      </VStack>

      {/* Template Action Modal */}
      <TemplateActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        template={template}
        onUseForNewGrow={() => onUseForNewGrow(template)}
        onCopyToNewTek={() => onCopyToNewTek(template)}
      />
    </Card>
  );
};
