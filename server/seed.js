import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';

const products = [
  {name:'Handcrafted Wooden Mandala Wall Art',price:8500,category:'Wood Carvings',image:'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=700&q=80',description:'Intricately carved wooden mandala made by traditional artisans.',discount:20,stock:20},
  {name:'Traditional Tibetan Singing Bowl',price:6200,category:'Metal Crafts',image:'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=700&q=80',description:'Hand-hammered brass singing bowl with a deep resonant tone.',discount:15,stock:15},
  {name:'Handwoven Pashmina Shawl',price:12000,category:'Textiles',image:'https://images.unsplash.com/photo-1606760227091-3dd850d97f1d?auto=format&fit=crop&w=700&q=80',description:'Soft handwoven shawl made with traditional weaving techniques.',discount:10,stock:12},
  {name:'Ceramic Artisan Tea Set',price:7500,category:'Pottery',image:'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=700&q=80',description:'Handmade ceramic tea set with a traditional glaze finish.',discount:25,stock:10},
  {name:'Handcrafted Brass Statue',price:9500,category:'Metal Crafts',image:'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?auto=format&fit=crop&w=700&q=80',description:'Decorative brass artwork crafted using traditional casting.',discount:12,stock:10},
  {name:'Handmade Felt Animal Rug',price:4500,category:'Textiles',image:'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=700&q=80',description:'Eco-friendly felt wool rug using traditional handmade techniques.',discount:18,stock:18},
  {name:'Newari Wood Carved Frame',price:5800,category:'Wood Carvings',image:'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=700&q=80',description:'Traditional carved wooden frame inspired by Newari craftsmanship.',discount:8,stock:20},
  {name:'Hand-painted Ceramic Vase',price:3900,category:'Pottery',image:'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=700&q=80',description:'Decorative ceramic vase with an artisan-painted finish.',discount:16,stock:20}
];

await mongoose.connect(process.env.MONGODB_URI);
await User.deleteMany({});
await Product.deleteMany({});
await User.create({name:'Site Administrator',email:'admin@lenjahandicraft.com',passwordHash:await bcrypt.hash('admin123',12),role:'admin'});
await User.create({name:'Demo Customer',email:'user@lenjahandicraft.com',passwordHash:await bcrypt.hash('user123',12),role:'user'});
await Product.insertMany(products);
console.log('Seed complete. Admin: admin@lenjahandicraft.com / admin123');
await mongoose.disconnect();
