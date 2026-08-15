import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { slug: 'klaviatury', title: 'клавиатуры', sortOrder: 1 },
  { slug: 'myshki', title: 'мышки', sortOrder: 2 },
  { slug: 'naushniki', title: 'наушники', sortOrder: 3 },
  { slug: 'kovriki', title: 'коврики', sortOrder: 4 },
  { slug: 'rukava', title: 'рукава', sortOrder: 5 },
];

type Seed = {
  slug: string;
  title: string;
  subtitle?: string;
  price: number;
  cat: string;
  popular?: boolean;
  limited?: boolean;
  description: string;
  specs: Record<string, string>;
};

const products: Seed[] = [
  {
    slug: 'black-pearl-signature-set',
    title: 'Black Pearl — Signature Set',
    subtitle: 'lunacy x akko',
    price: 19990,
    cat: 'klaviatury',
    popular: true,
    limited: true,
    description:
      'Коллаборация lunacy x akko. Полный сет: клавиатура, кейкапы и свитчи в едином оформлении. Ограниченная серия.',
    specs: { формат: '75%', свитчи: 'akko cream', подключение: '2.4G / BT / USB-C', корпус: 'алюминий' },
  },
  {
    slug: 'moonlight',
    title: 'moonlight',
    price: 9990,
    cat: 'klaviatury',
    popular: true,
    description: 'Клавиатура с gasket-креплением, трёхслойной шумоизоляцией и hot-swap платой.',
    specs: { формат: '75%', крепление: 'gasket', hotswap: 'да', подключение: '2.4G / BT / USB-C' },
  },
  {
    slug: 'kanagawa',
    title: 'kanagawa',
    price: 12990,
    cat: 'klaviatury',
    popular: true,
    description: 'Тематическая клавиатура серии wave. Кастомные кейкапы PBT, предсмазанные свитчи.',
    specs: { формат: '75%', кейкапы: 'PBT dye-sub', свитчи: 'предсмазанные', подключение: '2.4G / BT / USB-C' },
  },
  {
    slug: 'longwei',
    title: 'longwei',
    price: 12990,
    cat: 'klaviatury',
    description: 'Клавиатура серии dragon. Алюминиевый корпус, поворотный энкодер, RGB-подсветка.',
    specs: { формат: '75%', корпус: 'алюминий', энкодер: 'да', подключение: '2.4G / BT / USB-C' },
  },
  {
    slug: 'another-one',
    title: 'another one',
    price: 9990,
    cat: 'myshki',
    popular: true,
    description: 'Лёгкая беспроводная мышь для соревновательной игры. Сенсор PAW3395, 8K polling.',
    specs: { вес: '49 г', сенсор: 'PAW3395', dpi: '26000', polling: '8000 Гц' },
  },
  {
    slug: 'one',
    title: 'one',
    price: 6990,
    cat: 'myshki',
    description: 'Базовая беспроводная мышь линейки one. Симметричная форма, 1K polling.',
    specs: { вес: '58 г', сенсор: 'PAW3311', dpi: '12000', polling: '1000 Гц' },
  },
  {
    slug: 'louder-black',
    title: 'louder black',
    price: 12990,
    cat: 'naushniki',
    popular: true,
    description: 'Игровые наушники с 50 мм драйверами и съёмным микрофоном. Чёрный цвет.',
    specs: { драйверы: '50 мм', микрофон: 'съёмный', подключение: '2.4G / USB-C / 3.5mm', вес: '295 г' },
  },
  {
    slug: 'louder-white',
    title: 'louder white',
    price: 12990,
    cat: 'naushniki',
    description: 'Игровые наушники с 50 мм драйверами и съёмным микрофоном. Белый цвет.',
    specs: { драйверы: '50 мм', микрофон: 'съёмный', подключение: '2.4G / USB-C / 3.5mm', вес: '295 г' },
  },
  { slug: 'ctrl-shogun-l', title: 'СTRL shogun L', price: 4990, cat: 'kovriki', popular: true, description: 'Коврик серии CTRL, контролируемое скольжение. Размер L.', specs: { размер: '450x400x4 мм', тип: 'control', основа: 'резина' } },
  { slug: 'ctrl-fuji-xl', title: 'CTRL fuji XL', price: 6490, cat: 'kovriki', description: 'Коврик серии CTRL с принтом fuji. Размер XL.', specs: { размер: '900x400x4 мм', тип: 'control', основа: 'резина' } },
  { slug: 'ctrl-clear-black-xl', title: 'CTRL clear black XL', price: 6490, cat: 'kovriki', description: 'Однотонный коврик CTRL, чёрный. Размер XL.', specs: { размер: '900x400x4 мм', тип: 'control', основа: 'резина' } },
  { slug: 'ctrl-clear-white-xl', title: 'CTRL clear white XL', price: 6490, cat: 'kovriki', description: 'Однотонный коврик CTRL, белый. Размер XL.', specs: { размер: '900x400x4 мм', тип: 'control', основа: 'резина' } },
  { slug: 'alt-clear-black-l', title: 'ALT clear black L', price: 4990, cat: 'kovriki', description: 'Коврик серии ALT, быстрое скольжение. Чёрный, размер L.', specs: { размер: '450x400x4 мм', тип: 'speed', основа: 'резина' } },
  { slug: 'alt-clear-grey-l', title: 'ALT clear grey L', price: 4990, cat: 'kovriki', description: 'Коврик серии ALT, быстрое скольжение. Серый, размер L.', specs: { размер: '450x400x4 мм', тип: 'speed', основа: 'резина' } },
  { slug: 'slip-white-sakura-l', title: 'Slip white sakura L', price: 1990, cat: 'kovriki', description: 'Коврик Slip с принтом sakura, белый. Размер L.', specs: { размер: '450x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-black-sakura-l', title: 'Slip black sakura L', price: 1990, cat: 'kovriki', description: 'Коврик Slip с принтом sakura, чёрный. Размер L.', specs: { размер: '450x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-white-sakura-xl', title: 'Slip white sakura XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом sakura, белый. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-black-sakura-xl', title: 'Slip black sakura XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом sakura, чёрный. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-ronin-xl', title: 'Slip ronin XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом ronin. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-moonway-xl', title: 'Slip moonway XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом moonway. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-mission-xl', title: 'Slip mission XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом mission. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'slip-outlines-xl', title: 'Slip outlines XL', price: 2490, cat: 'kovriki', description: 'Коврик Slip с принтом outlines. Размер XL.', specs: { размер: '900x400x3 мм', тип: 'balance', основа: 'резина' } },
  { slug: 'shell-black', title: 'shell black', price: 1490, cat: 'rukava', description: 'Игровой рукав shell, чёрный. Компрессионная ткань, без скольжения.', specs: { материал: 'нейлон / спандекс', размеры: 'S / M / L', цвет: 'чёрный' } },
  { slug: 'shell-white', title: 'shell white', price: 1490, cat: 'rukava', description: 'Игровой рукав shell, белый. Компрессионная ткань, без скольжения.', specs: { материал: 'нейлон / спандекс', размеры: 'S / M / L', цвет: 'белый' } },
];

const stories = [
  {
    title: 'jetcar 67',
    caption: 'бустер показывает 67 у гиперкара',
    mediaUrl: '/stories/story-1.webp',
    accent: '#7fd4e8',
    sortOrder: 1,
  },
  {
    title: 'ночная заправка',
    caption: 'два urus и один вопрос: 6 или 7',
    mediaUrl: '/stories/story-2.webp',
    accent: '#9b6bff',
    sortOrder: 2,
  },
  {
    title: 'пхукет',
    caption: 'сетап уехал в отпуск',
    mediaUrl: '/stories/story-3.webp',
    accent: '#5ec98a',
    sortOrder: 3,
  },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  const catMap = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  let i = 0;
  for (const p of products) {
    const categoryId = catMap.get(p.cat);
    if (!categoryId) throw new Error(`unknown category ${p.cat}`);
    const data = {
      title: p.title,
      subtitle: p.subtitle ?? null,
      description: p.description,
      price: p.price,
      images: [`/products/${p.slug}.webp`],
      specs: p.specs,
      isPopular: p.popular ?? false,
      isLimited: p.limited ?? false,
      sortOrder: i++,
      categoryId,
    };
    await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }

  await prisma.story.deleteMany();
  await prisma.story.createMany({ data: stories });

  console.log(`seeded: ${categories.length} categories, ${products.length} products, ${stories.length} stories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
