import React, { useEffect, useState } from 'react';

const ProductProcessor = () => {
  // Define the product arrays inside the component
  const [productsArray1] = useState([
    { name: "Laptop", category: "Electronics", price: 1000, stock: 30 },
    { name: "Phone", category: "Electronics", price: 600, stock: 70 },
    { name: "Shirt", category: "Clothing", price: 50, stock: 20 }
  ]);

  const [productsArray2] = useState([
    { name: "TV", category: "Electronics", price: 800, stock: 40 },
    { name: "Pants", category: "Clothing", price: 40, stock: 10 },
    { name: "Tablet", category: "Electronics", price: 300, stock: 60 }
  ]);

  // State to hold the processed results
  const [mergedProducts, setMergedProducts] = useState([]);
  const [totalStock, setTotalStock] = useState(0);

  useEffect(() => {
    // Step 1: Merge the two product arrays
    const merged = [...productsArray1, ...productsArray2];

    // Step 2: Increase price of non-electronics by 10%
    const updatedProducts = merged.map((product) => {
      if (product.category !== "Electronics") {
        return {
          ...product,
          price: product.price * 1.1, // Increase price by 10%
        };
      }
      return product;
    });

    // Step 3: Filter products with stock <= 50
    const filteredProducts = updatedProducts.filter((product) => product.stock <= 50);

    // Step 4: Calculate the total stock of filtered products
    const totalStockValue = filteredProducts.reduce((total, product) => total + product.stock, 0);

    // Update the state with processed products and total stock
    setMergedProducts(updatedProducts);
    setTotalStock(totalStockValue);
  }, [productsArray1, productsArray2]);

  return (
    <div>
      <h1>Product List</h1>
      <ul>
        {mergedProducts.map((product, index) => (
          <li key={index}>
            <strong>{product.name}</strong> - {product.category} - ${product.price.toFixed(2)} - Stock: {product.stock}
          </li>
        ))}
      </ul>
      <h2>Total Stock (Products with Stock ≤ 50): {totalStock}</h2>
    </div>
  );
};

export default ProductProcessor;
