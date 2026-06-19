/**
 * The category taxonomy seeded into every new book, taken verbatim from André's Excel.
 * `slug` is the stable key; `color` is a palette token resolved by the theme layer.
 */
export type SubTemplate = { slug: string; name: string };
export type CategoryTemplate = {
  slug: string;
  name: string;
  color: string;
  sort: number;
  subs: SubTemplate[];
};

export const CATEGORY_TEMPLATE: CategoryTemplate[] = [
  {
    slug: "day_to_day",
    name: "Day to day",
    color: "amber",
    sort: 0,
    subs: [
      { slug: "groceries", name: "Groceries" },
      { slug: "furniture", name: "Furniture" },
      { slug: "dining_out", name: "Dining out" },
      { slug: "cafe", name: "Café" },
      { slug: "gifts", name: "Gifts" },
      { slug: "activities", name: "Activities" },
      { slug: "gym", name: "Gym" },
      { slug: "subs", name: "Subs" },
      { slug: "transport", name: "Transport" },
      { slug: "health", name: "Health" },
      { slug: "other", name: "Other" },
    ],
  },
  {
    slug: "car",
    name: "Car",
    color: "green",
    sort: 1,
    subs: [
      { slug: "gasolina", name: "Gasolina" },
      { slug: "portagens", name: "Portagens" },
      { slug: "park", name: "Park" },
      { slug: "mecanico", name: "Mecânico" },
      { slug: "extras", name: "Extras" },
    ],
  },
  {
    slug: "travel",
    name: "Travel",
    color: "orange",
    sort: 2,
    subs: [
      { slug: "voos", name: "Voos" },
      { slug: "estadias", name: "Estadias" },
      { slug: "comida", name: "Comida" },
      { slug: "souvs", name: "Souvs" },
      { slug: "others", name: "Others" },
    ],
  },
  {
    slug: "personal",
    name: "Personal",
    color: "blue",
    sort: 3,
    subs: [
      { slug: "tech", name: "Tech" },
      { slug: "new_games", name: "New Games" },
      { slug: "dlcs", name: "DLCs" },
      { slug: "rp", name: "RP" },
      { slug: "other", name: "Other" },
    ],
  },
  {
    slug: "others",
    name: "Others",
    color: "slate",
    sort: 4,
    subs: [
      { slug: "withdrawals", name: "Withdrawals" },
      { slug: "other", name: "Other" },
    ],
  },
];
