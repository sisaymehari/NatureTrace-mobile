import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '@/constants/theme';

type Category = 'wildlife' | 'plant' | 'marine' | 'invasive';

type Species = {
  id: string;
  emoji: string;
  name: string;
  category: Category;
  description: string;
};

const SPECIES: Species[] = [
  {
    id: '1',
    emoji: '🐘',
    name: 'African Elephant',
    category: 'wildlife',
    description:
      'The largest land animal on Earth. Elephants live in matriarchal herds and are known for their long memory, tool use, and complex social bonds. Threatened by poaching and habitat loss.',
  },
  {
    id: '2',
    emoji: '🌺',
    name: 'Rafflesia Arnoldii',
    category: 'plant',
    description:
      'Produces the largest individual flower in the world, reaching up to one metre in diameter. It is a parasitic plant with no leaves, roots, or stem, found only in Sumatra and Borneo.',
  },
  {
    id: '3',
    emoji: '🐠',
    name: 'Clownfish',
    category: 'marine',
    description:
      'Famous for their symbiotic relationship with sea anemones, clownfish are protandrous hermaphrodites. Found in warm waters of the Indian and Pacific Oceans.',
  },
  {
    id: '4',
    emoji: '🌿',
    name: 'Kudzu Vine',
    category: 'invasive',
    description:
      'Native to Japan, kudzu was introduced to the United States in 1876. It grows up to 30 cm per day, smothering native vegetation and earning the nickname "the vine that ate the South".',
  },
  {
    id: '5',
    emoji: '🦁',
    name: 'African Lion',
    category: 'wildlife',
    description:
      'The only truly social big cat, lions live in groups called prides. Males are distinguished by their manes. Listed as Vulnerable due to habitat loss and human-wildlife conflict.',
  },
  {
    id: '6',
    emoji: '🌊',
    name: 'Blue Whale',
    category: 'marine',
    description:
      'The largest animal known to have ever existed, reaching up to 30 m in length. Blue whales communicate using low-frequency sounds audible for hundreds of kilometres underwater.',
  },
  {
    id: '7',
    emoji: '🌲',
    name: 'Wollemi Pine',
    category: 'plant',
    description:
      'A living fossil discovered in 1994 in Australia. Thought to be extinct for 200 million years, fewer than 100 wild trees remain in a single canyon in the Blue Mountains.',
  },
  {
    id: '8',
    emoji: '🐝',
    name: 'European Honey Bee',
    category: 'invasive',
    description:
      'Though vital pollinators globally, Apis mellifera is considered invasive in parts of the Americas and Australia, outcompeting native bee species for floral resources and nesting sites.',
  },
  {
    id: '9',
    emoji: '🐆',
    name: 'Snow Leopard',
    category: 'wildlife',
    description:
      'A large cat native to mountain ranges of Central and South Asia. Perfectly adapted for cold, steep terrain with wide paws and a thick, insulating tail they wrap around themselves.',
  },
  {
    id: '10',
    emoji: '🐙',
    name: 'Giant Pacific Octopus',
    category: 'marine',
    description:
      'The world\'s largest octopus, capable of changing colour and texture in milliseconds. They are highly intelligent, known to open jars, navigate mazes, and recognise individual humans.',
  },
];

const CATEGORY_CONFIG: Record<Category, { color: string; label: string }> = {
  wildlife: { color: AppColors.category.wildlife, label: 'Wildlife' },
  plant: { color: AppColors.category.plant, label: 'Plant' },
  marine: { color: AppColors.category.marine, label: 'Marine' },
  invasive: { color: AppColors.category.invasive, label: 'Invasive' },
};

function SpeciesCard({ species }: { species: Species }) {
  const config = CATEGORY_CONFIG[species.category];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{species.emoji}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.speciesName}>{species.name}</Text>
          <View style={[styles.badge, { backgroundColor: config.color + '22' }]}>
            <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.description}>{species.description}</Text>
    </View>
  );
}

export default function LearnScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Species Guide</Text>
          <Text style={styles.subtitle}>Learn about the species you might encounter</Text>
        </View>

        {/* Filter legend */}
        <View style={styles.legend}>
          {(Object.entries(CATEGORY_CONFIG) as [Category, { color: string; label: string }][]).map(
            ([cat, config]) => (
              <View key={cat} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.legendText}>{config.label}</Text>
              </View>
            ),
          )}
        </View>

        <View style={styles.listContainer}>
          {SPECIES.map((species) => (
            <SpeciesCard key={species.id} species={species} />
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: AppColors.text },
  subtitle: { fontSize: 14, color: AppColors.secondaryText, marginTop: 4 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginVertical: 12,
    gap: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: AppColors.secondaryText },
  listContainer: { paddingHorizontal: 20, gap: 14 },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  emoji: { fontSize: 40 },
  cardMeta: { flex: 1, gap: 6 },
  speciesName: { fontSize: 17, fontWeight: '700', color: AppColors.text, flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  description: { fontSize: 14, color: AppColors.secondaryText, lineHeight: 21 },
  bottomPad: { height: 20 },
});
