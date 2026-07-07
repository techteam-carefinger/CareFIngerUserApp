import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {legalService} from '../services';

type LegalScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TermsAndConditions' | 'PrivacyPolicy'
>;

const DOC_CONFIG = {
  PrivacyPolicy: {
    title: 'Privacy Policy',
    fetch: legalService.getUserPrivacy,
    fallback: 'Could not load Privacy Policy. Please try again.',
    empty: 'Privacy Policy is not available right now.',
  },
  TermsAndConditions: {
    title: 'Terms & Conditions',
    fetch: legalService.getUserTerms,
    fallback: 'Could not load Terms & Conditions. Please try again.',
    empty: 'Terms & Conditions are not available right now.',
  },
} as const;

type Block = {
  key: string;
  type: 'heading' | 'listitem' | 'paragraph';
  text: string;
};

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, entity => HTML_ENTITIES[entity] ?? entity);

/**
 * Converts admin-authored HTML into a flat list of text blocks. This keeps the
 * screen dependency-free while still preserving headings, paragraphs and
 * bullet lists, which covers the content served by `get_user_terms`.
 */
const parseHtml = (html: string): Block[] => {
  const normalized = html
    .replace(/<\s*(br|hr)\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\u0000LI\u0000')
    .replace(/<\s*h[1-6][^>]*>/gi, '\u0000H\u0000')
    .replace(/<\/\s*(p|div|h[1-6]|li|ul|ol|section)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return normalized
    .split('\n')
    .map(line => decodeEntities(line).replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      if (line.startsWith('\u0000H\u0000')) {
        return {
          key: `b-${index}`,
          type: 'heading' as const,
          text: line.replace(/\u0000H\u0000/g, '').replace(/\u0000LI\u0000/g, '').trim(),
        };
      }
      if (line.startsWith('\u0000LI\u0000')) {
        return {
          key: `b-${index}`,
          type: 'listitem' as const,
          text: line.replace(/\u0000LI\u0000/g, '').replace(/\u0000H\u0000/g, '').trim(),
        };
      }
      return {
        key: `b-${index}`,
        type: 'paragraph' as const,
        text: line.replace(/\u0000LI\u0000/g, '').replace(/\u0000H\u0000/g, '').trim(),
      };
    })
    .filter(block => block.text.length > 0);
};

function LegalDocumentScreen({navigation, route}: LegalScreenProps) {
  const config = DOC_CONFIG[route.name];
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const document = await config.fetch();
      setBlocks(parseHtml(document.content ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : config.fallback);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton
            title="Retry"
            onPress={loadDocument}
            style={styles.retryButton}
          />
        </View>
      );
    }

    if (blocks.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>{config.empty}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {blocks.map(block => {
          if (block.type === 'heading') {
            return (
              <Text key={block.key} style={styles.heading}>
                {block.text}
              </Text>
            );
          }
          if (block.type === 'listitem') {
            return (
              <View key={block.key} style={styles.listRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.listText}>{block.text}</Text>
              </View>
            );
          }
          return (
            <Text key={block.key} style={styles.paragraph}>
              {block.text}
            </Text>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{config.title}</Text>
        <View style={styles.backButton} />
      </View>
      {renderBody()}
    </SafeAreaView>
  );
}

// Distinct component references per route. Sharing a single component across two
// native-stack screens lets React Navigation reuse the same mounted instance,
// which caused one document (e.g. Privacy Policy) to show up in place of the
// other. Wrapping the shared implementation keeps each route independent.
export function TermsAndConditionsScreen(
  props: NativeStackScreenProps<RootStackParamList, 'TermsAndConditions'>,
) {
  return <LegalDocumentScreen {...props} />;
}

export function PrivacyPolicyScreen(
  props: NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>,
) {
  return <LegalDocumentScreen {...props} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  backIcon: {
    fontSize: 24,
    lineHeight: 24,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: COLORS.error,
    fontFamily: FONTS.regular,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginTop: 18,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.primary,
    marginRight: 8,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
});
