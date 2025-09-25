// App.js
import React from 'react';
import ProductTable from './ProductTable';

const App = () => {
  const productsData = [
    { id: 1, name: "Laptop", price: 999.99, image: "https://via.placeholder.com/100" },
    { id: 2, name: "Smartphone", price: 599.99, image: "https://via.placeholder.com/100" },
    { id: 3, name: "Tablet", price: 299.99, image: "https://via.placeholder.com/100" },
    { id: 4, name: "Headphones", price: 199.99, image: "https://via.placeholder.com/100" },
    { id: 5, name: "Smartwatch", price: 249.99, image: "https://via.placeholder.com/100" },
  ];

  return (
    <div className="App">
      <h1>Welcome to Product Store</h1>
      <ProductTable products={productsData} />
    </div>
  );
};

export default App;
