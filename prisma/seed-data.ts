export const marketplaces = [
  { name: "Amazon India", slug: "amazon", baseUrl: "https://www.amazon.in" },
  { name: "Flipkart", slug: "flipkart", baseUrl: "https://www.flipkart.com" },
  { name: "Meesho", slug: "meesho", baseUrl: "https://www.meesho.com" },
  { name: "Myntra", slug: "myntra", baseUrl: "https://www.myntra.com" },
  { name: "AJIO", slug: "ajio", baseUrl: "https://www.ajio.com" },
] as const;

export const categories = [
  ["Beauty & Personal Care", "beauty-personal-care"],
  ["Home & Kitchen", "home-kitchen"],
  ["Fashion", "fashion"],
  ["Electronics", "electronics"],
  ["Fitness", "fitness"],
  ["Accessories", "accessories"],
  ["Baby & Kids", "baby-kids"],
  ["Books & Learning", "books-learning"],
] as const;

export const productTemplates = [
  ["Matte Lip Colour Set", "beauty-personal-care", 349, 699],
  ["Stainless Steel Lunch Box", "home-kitchen", 599, 999],
  ["Women’s Printed Kurta", "fashion", 799, 1599],
  ["Wireless Bluetooth Earbuds", "electronics", 1299, 2999],
  ["Resistance Band Kit", "fitness", 499, 999],
  ["Structured Everyday Handbag", "accessories", 899, 1899],
  ["Baby Feeding Essentials Set", "baby-kids", 649, 1199],
  ["Early Learning Activity Cards", "books-learning", 299, 599],
  ["Vitamin C Face Serum", "beauty-personal-care", 449, 899],
  ["Compact Vegetable Chopper", "home-kitchen", 399, 799],
] as const;
