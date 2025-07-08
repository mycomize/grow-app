import React, { useState } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { RefreshCw, Clock, Eye, Tag, Trash2, SquarePen } from 'lucide-react-native';
import { InfoBadge } from '~/components/ui/info-badge';

interface MonotubTekTemplate {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  tek_type: string;
  difficulty: string;
  estimated_timeline?: number;
  tags?: string[];
  is_public: boolean;
  created_by: number;
  created_at: string;
  usage_count: number;
  creator_name?: string;
}

interface TemplateCardProps {
  template: MonotubTekTemplate;
  onPress: (template: MonotubTekTemplate) => void;
  onUseTemplate: (template: MonotubTekTemplate) => void;
  onDelete: (template: MonotubTekTemplate) => void;
  onEdit: (template: MonotubTekTemplate) => void;
  onConvertToGrow: (template: MonotubTekTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPress,
  onUseTemplate,
  onDelete,
  onEdit,
  onConvertToGrow,
}) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  return (
    <Card className="w-11/12 rounded-xl bg-background-0">
      <VStack className="p-2">
        <View>
          <Pressable onPress={() => onPress(template)}>
            {/* Header with template name and variant/species */}
            <HStack className="mb-5 items-center justify-between">
              <Heading size="lg">{template.name}</Heading>
              <Text className="text-lg italic text-typography-500">
                {template.variant || template.species}
              </Text>
            </HStack>

            {/* Description */}
            {template.description && (
              <Text className="mb-4 text-sm text-typography-600" numberOfLines={2}>
                {template.description}
              </Text>
            )}

            {/* Info badge row */}
            <VStack className="mb-4" space="md">
              <HStack space="md">
                {template.estimated_timeline && (
                  <InfoBadge
                    text={`~${template.estimated_timeline} days`}
                    icon={Clock}
                    variant="default"
                    size="md"
                  />
                )}
                <InfoBadge
                  text={`Used ${template.usage_count} times`}
                  icon={Eye}
                  variant="default"
                  size="md"
                />
              </HStack>

              {/* Creator name */}
              {template.creator_name && (
                <Text className="text-sm text-typography-500">@{template.creator_name}</Text>
              )}
            </VStack>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <VStack className="mb-4" space="xs">
                <HStack space="xs" className="flex-wrap items-center">
                  <Icon as={Tag} size="sm" className="mr-2 text-typography-500" />
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <InfoBadge key={index} text={tag} variant="info" size="sm" />
                  ))}
                  {template.tags.length > 3 && (
                    <Text className="text-xs text-typography-400">
                      +{template.tags.length - 3} more
                    </Text>
                  )}
                </HStack>
              </VStack>
            )}
          </Pressable>

          {/* Action controls */}
          <HStack className="mt-2 justify-around" space="md">
            <Pressable onPress={() => onConvertToGrow(template)}>
              <Icon as={RefreshCw} size="xl" />
            </Pressable>
            <Pressable onPress={() => onEdit(template)}>
              <Icon as={SquarePen} size="xl" />
            </Pressable>
            <Pressable onPress={() => setShowDeleteAlert(true)}>
              <Icon as={Trash2} size="xl" className="text-error-500" />
            </Pressable>
          </HStack>
        </View>
      </VStack>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={async () => {
          setShowDeleteAlert(false);
          await onDelete(template);
        }}
        title="Delete Template"
        itemName={template.name}
      />
    </Card>
  );
};
