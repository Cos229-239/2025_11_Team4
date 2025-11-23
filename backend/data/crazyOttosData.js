// backend/data/crazyOttosData.js

// Core restaurant info for Crazy Otto's
const crazyOttosRestaurant = {
  id: 0,
  name: "Crazy Otto's Diner",
  description: "Local diner favorite with huge portions and all-day breakfast.",
  cuisine_type: "American Diner",
  rating: 4.0,
  price_range: "$$",
  // You can store multiple locations here
  locations: [
    {
      id: 1,
      label: "Lancaster (Ave I)",
      address_line1: "1365 W Avenue I",
      address_line2: "",
      city: "Lancaster",
      state: "CA",
      zip: "93534"
    },
    {
      id: 2,
      label: "Lancaster (Ave J)",
      address_line1: "1228 W Avenue J",
      address_line2: "",
      city: "Lancaster",
      state: "CA",
      zip: "93534"
    }
    // Add more locations if you want
  ],
  //  *cannot* use "../assets/photos/..." here because that path only exists
  // in the frontend build. For now just keep a placeholder or a URL.
  logo_url: null, // e.g. "/photos/crazy-ottos-logo.png" later if we host it
};

// High-level menu categories (for the tabs)
const crazyOttosMenuCategories = [
  "Breakfast Specials",
  "Omelettes",
  "Skillets",
  "Pancakes & Waffles",
  "Burgers & Sandwiches",
  "Sides & Extras",
  "Kids Menu"
];

// Individual menu items – shaped for the frontend MenuPage/MenuItemCard
const crazyOttosMenuItems = [
  // Breakfast Specials
  {
    id: 100,
    restaurant_id: 0,
    name: "Chicken Fried Steak & Eggs",
    description:
      "Hand-breaded chicken fried steak topped with country gravy, two eggs any style, hash browns, and toast or biscuit.",
    price: 17.99,
    category: "Breakfast Specials",
    available: true,
    image_url: null
  },
  {
    id: 101,
    restaurant_id: 0,
    name: "Crazy Train Combo",
    description:
      "Two pancakes or French toast, two eggs any style, and choice of bacon or sausage.",
    price: 15.49,
    category: "Breakfast Specials",
    available: true,
    image_url: null
  },
  {
    id: 102,
    restaurant_id: 0,
    name: "Biscuits & Gravy Plate",
    description:
      "Fresh baked biscuits smothered in sausage gravy, served with two eggs and hash browns.",
    price: 13.99,
    category: "Breakfast Specials",
    available: true,
    image_url: null
  },

  // Omelettes
  {
    id: 110,
    restaurant_id: 0,
    name: "Engineer's Omelette",
    description:
      "Three-egg omelette packed with ham, bacon, sausage, cheddar, onions, and bell peppers. Served with hash browns and toast.",
    price: 16.99,
    category: "Omelettes",
    available: true,
    image_url: null
  },
  {
    id: 111,
    restaurant_id: 0,
    name: "Veggie Track Omelette",
    description:
      "Mushrooms, spinach, tomatoes, onions, and jack cheese with hash browns and toast.",
    price: 15.49,
    category: "Omelettes",
    available: true,
    image_url: null
  },

  // Skillets
  {
    id: 120,
    restaurant_id: 0,
    name: "Country Skillet",
    description:
      "Crispy potatoes topped with sausage, onions, peppers, cheddar cheese, and two eggs any style. Served with toast.",
    price: 16.49,
    category: "Skillets",
    available: true,
    image_url: null
  },

  // Pancakes & Waffles
  {
    id: 130,
    restaurant_id: 0,
    name: "Stacked Pancakes",
    description:
      "Three fluffy buttermilk pancakes with whipped butter and warm syrup.",
    price: 11.99,
    category: "Pancakes & Waffles",
    available: true,
    image_url: null
  },
  {
    id: 131,
    restaurant_id: 0,
    name: "Chicken & Waffles",
    description:
      "Crispy fried chicken tenders over a golden waffle with butter and syrup.",
    price: 16.99,
    category: "Pancakes & Waffles",
    available: true,
    image_url: null
  },

  // Burgers & Sandwiches
  {
    id: 140,
    restaurant_id: 0,
    name: "Crazy Otto Burger",
    description:
      "Half-pound burger with cheddar, lettuce, tomato, onion, pickles, and house sauce. Served with fries.",
    price: 15.99,
    category: "Burgers & Sandwiches",
    available: true,
    image_url: null
  },
  {
    id: 141,
    restaurant_id: 0,
    name: "Patty Melt",
    description:
      "Grilled rye with a beef patty, caramelized onions, and Swiss cheese. Served with fries.",
    price: 15.49,
    category: "Burgers & Sandwiches",
    available: true,
    image_url: null
  },

  // Sides & Extras
  {
    id: 150,
    restaurant_id: 0,
    name: "Hash Browns",
    description: "Golden crispy shredded potatoes.",
    price: 4.99,
    category: "Sides & Extras",
    available: true,
    image_url: null
  },
  {
    id: 151,
    restaurant_id: 0,
    name: "Bacon or Sausage",
    description: "Choice of bacon strips or breakfast sausage links.",
    price: 5.49,
    category: "Sides & Extras",
    available: true,
    image_url: null
  },

  // Kids menu
  {
    id: 160,
    restaurant_id: 0,
    name: "Kids Pancake Plate",
    description:
      "One pancake, one egg, and choice of bacon or sausage. For kids 10 and under.",
    price: 8.99,
    category: "Kids Menu",
    available: true,
    image_url: null
  }
];

module.exports = {
  crazyOttosRestaurant,
  crazyOttosMenuCategories,
  crazyOttosMenuItems
};
