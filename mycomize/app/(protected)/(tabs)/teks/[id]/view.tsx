import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';
import { Divider } from '~/components/ui/divider';
import { Avatar, AvatarFallbackText, AvatarImage } from '~/components/ui/avatar';
import { Icon } from '~/components/ui/icon';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import { InfoBadge } from '~/components/ui/info-badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Lock,
  Package,
  Thermometer,
  CheckSquare,
  Eye
} from 'lucide-react-native';
import { BulkGrowTekIcon } from '~/lib/types/bulkGrowTypes';
import { BULK_GROW_TEK_STAGES, BulkGrowCultivationStage } from '~/lib/types/tekTypes';
import { StageSection } from '~/components/tek/StageSection';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';
import { useProfile, useProfileImage } from '~/lib/stores/profileStore';
import { formatCount, parseNumberCount } from '~/lib/utils/numberFormatting';
import {
  useFetchTeks,
  useViewTek,
  useTekById,
} from '~/lib/stores';
import { useState, useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function TekViewScreen() {
  const { id } = useLocalSearchParams();
  const token = useAuthToken();
  const profile = useProfile();
  const profileImage = useProfileImage();
  const fetchTeks = useFetchTeks();
  const viewTek = useViewTek();
  const tekData = useTekById(id as string);
  
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // Fetch teks to ensure we have the data, then track view
      const initializeAndTrackView = async () => {
        if (!token || !id) return;
        
        try {
          // Only fetch if we don't have the tek data
          if (!tekData) {
            await fetchTeks(token);
          }
          
          // Track view when screen is focused
          await viewTek(token, id as string);
        } catch (error) {
          console.error('Error loading tek or tracking view:', error);
        } finally {
          setIsLoading(false);
        }
      };

      initializeAndTrackView();
    }, [fetchTeks, viewTek, id, token, tekData])
  );

  // Get the appropriate profile image for the tek creator
  const getCreatorProfileImage = () => {
    // If this is the current user's tek (private tek), use profile store image
    if (profile && tekData?.creator_name === profile.username) {
      return profileImage;
    }
    // Otherwise, use the creator_profile_image from the tek data (public teks)
    return tekData?.creator_profile_image;
  };

  // Get the first two letters of creator name for avatar fallback
  const getCreatorInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  const creatorProfileImage = getCreatorProfileImage();

  const getItemCounts = (stage: BulkGrowCultivationStage) => {
    const stageData = tekData?.stages?.[stage];
    return {
      items: stageData?.items?.length || 0,
      conditions: stageData?.environmental_conditions?.length || 0,
      tasks: stageData?.tasks?.length || 0,
    };
  };

  const renderCountBadges = (stage: BulkGrowCultivationStage) => {
    const counts = getItemCounts(stage);
    const badges = [];

    if (counts.items > 0) {
      badges.push(
        <InfoBadge
          key="materials"
          icon={Package}
          text={`x ${counts.items}`}
          variant="default"
          size="sm"
        />
      );
    }

    if (counts.conditions > 0) {
      badges.push(
        <InfoBadge
          key="conditions"
          icon={Thermometer}
          text={`x ${counts.conditions}`}
          variant="default"
          size="sm"
        />
      );
    }

    if (counts.tasks > 0) {
      badges.push(
        <InfoBadge
          key="tasks"
          icon={CheckSquare}
          text={`x ${counts.tasks}`}
          variant="default"
          size="sm"
        />
      );
    }

    return badges.length > 0 ? badges : null;
  };

  // Show loading while initializing
  if (isLoading || !tekData) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading tek...</Text>
      </VStack>
    );
  }

  const stageOrder: BulkGrowCultivationStage[] = [
    'inoculation',
    'spawn_colonization',
    'bulk_colonization',
    'fruiting',
    'harvest',
  ];

  return (
    <VStack className="flex-1 bg-background-50">
      {/* Back Button */}
      <ScrollView className="flex-1">
        <VStack className="pt-2 pb-3 px-2" space="md">
          {/* Author Information - Prominent Display Above Tek Name */}
          <VStack className="bg-background-0 rounded-md pt-4 px-6 pb-6" space="md">
            <HStack className="items-center" space="md">
              <Avatar size="lg">
                {creatorProfileImage ? (
                  <AvatarImage source={{ uri: creatorProfileImage }} />
                ) : (
                  <AvatarFallbackText>{getCreatorInitials(tekData.creator_name)}</AvatarFallbackText>
                )}
              </Avatar>
              <VStack className="flex-1" space="xs">
                <Text className="text-xl font-bold text-typography-700">
                  @{tekData.creator_name}
                </Text>
                {tekData.variant && (
                  <Text className="text-md text-typography-600" numberOfLines={1} ellipsizeMode='tail'>{tekData.variant}</Text>
                )}
                {tekData.species && (
                  <Text className="text-md text-typography-500 italic" numberOfLines={1} ellipsizeMode='tail'>{tekData.species}</Text>
                )}
              </VStack>
              <VStack className="items-end" space="xs">
                <HStack className="items-center" space="sm">
                  <AntDesign name="heart" size={13} color="#ff2400" />
                  <Text className="text-md text-typography-400">
                    {formatCount(parseNumberCount(tekData.like_count || 0))} likes
                  </Text>
                </HStack>
                <HStack className="items-center" space="sm">
                  <MaterialCommunityIcons name="mushroom-outline" size={16} color="#4dbe6c" />
                  <Text className="text-md text-typography-400">
                    {formatCount(parseNumberCount(tekData.import_count || 0))} re-grows 
                  </Text>
                </HStack>
                <HStack className="items-center" space="sm">
                  <Icon as={Eye} className="text-typography-400" size="sm" />
                  <Text className="text-md text-typography-400">
                    {formatCount(parseNumberCount(tekData.view_count || 0))} views
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {/* Tek Name */}
            <HStack className="mt-3 flex">
                <Text className="flex-1 text-xl font-bold text-typography-900" numberOfLines={1} ellipsizeMode='tail'>
                  {tekData.name}
                </Text>
                <HStack className="ml-auto">
                  <InfoBadge
                    text={tekData.is_public ? 'Public' : 'Private'}
                    icon={tekData.is_public ? Users : Lock}
                    variant='default'
                    />
                </HStack>
            </HStack>
            {tekData.description && (
              <Text className="text-md text-typography-600">
                {tekData.description}
              </Text>
            )}

            {/* Tags */}
            {tekData.tags && tekData.tags.length > 0 && (
              <HStack space="xs" className="flex-wrap">
                {tekData.tags.map((tag: string, index: number) => (
                  <Text key={index} className="text-md text-blue-400">
                    #{tag}
                  </Text>
                ))}
              </HStack>
            )}

            <Divider className="mt-2"/>

            <HStack className="pt-2 items-center" space="md">
              <MaterialCommunityIcons name="mushroom-outline" color="#6c6c6c" size={24} />
              <Text className="text-lg font-semibold">Stages</Text>
            </HStack>

            <VStack className="px-0 pb-0">
              <Accordion
                type="multiple"
                variant="unfilled"
                className="m-0 w-full gap-0 p-0">
                {stageOrder.map((stage) => {
                  const counts = getItemCounts(stage);
                  const hasContent = counts.items > 0 || counts.conditions > 0 || counts.tasks > 0 || tekData.stages?.[stage]?.notes;
                  
                  if (!hasContent) return null;
                  
                  return (
                    <AccordionItem key={stage} value={stage} className="rounded-md">
                      <AccordionHeader>
                        <AccordionTrigger>
                          {({ isExpanded }: { isExpanded: boolean }) => (
                            <HStack className="flex-1 items-center justify-between">
                              <HStack className="flex-1 items-center" space="sm">
                                <BulkGrowTekIcon stage={stage} />
                                <VStack className="ml-2 flex-1 items-start" space="xs">
                                  <Text className="text-lg font-semibold text-typography-700">
                                    {BULK_GROW_TEK_STAGES[stage]}
                                  </Text>
                                  <HStack space="xs">{renderCountBadges(stage)}</HStack>
                                </VStack>
                              </HStack>
                              <Icon
                                as={isExpanded ? ChevronDown : ChevronRight}
                                size="lg"
                                className="text-typography-900"
                              />
                            </HStack>
                          )}
                        </AccordionTrigger>
                      </AccordionHeader>
                      <AccordionContent>
                        {tekData.stages?.[stage] && (
                          <StageSection
                            stageData={tekData.stages[stage]}
                            stageKey={stage}
                            onUpdateBulkStageData={() => {}} // Read-only, no updates
                            readOnly={true}
                          />
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </VStack>
          </VStack>

          {/* Stages Section */}
          <VStack className="bg-background-0 rounded-md">
            
          </VStack>
        </VStack>
      </ScrollView>
    </VStack>
  );
}
