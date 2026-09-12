export type Cocktail = {
  id: number;
  name: string;
  description: string;
  price: number;
};

export const COCKTAILS: Cocktail[] = [
  { id: 1, name: "Ginistry G&T", description: "House gin, premium tonic, lime", price: 8.5 },
  { id: 2, name: "Negroni", description: "Gin, Campari, sweet vermouth, orange", price: 9.0 },
  { id: 3, name: "Tom Collins", description: "Gin, lemon juice, sugar syrup, soda", price: 8.5 },
  { id: 4, name: "Gimlet", description: "Gin, lime cordial, fresh lime", price: 8.0 },
  { id: 5, name: "Aviation", description: "Gin, maraschino, crème de violette, lemon", price: 9.5 },
  { id: 6, name: "Clover Club", description: "Gin, raspberry syrup, lemon, egg white", price: 9.5 },
  { id: 7, name: "Bee's Knees", description: "Gin, honey syrup, lemon juice", price: 8.5 },
  { id: 8, name: "French 75", description: "Gin, champagne, lemon, sugar", price: 11.0 },
  { id: 9, name: "Bramble", description: "Gin, blackberry liqueur, lemon, sugar", price: 9.0 },
  {
    id: 10,
    name: "Singapore Sling",
    description: "Gin, cherry brandy, Bénédictine, pineapple",
    price: 10.5,
  },
  { id: 11, name: "Last Word", description: "Gin, green Chartreuse, maraschino, lime", price: 10.0 },
  { id: 12, name: "White Lady", description: "Gin, Cointreau, lemon juice, egg white", price: 9.0 },
];

export const GIN_PRICE = 9.5;
