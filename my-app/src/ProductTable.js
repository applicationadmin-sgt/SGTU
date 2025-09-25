// ProductTable.js
import React from 'react';

const ProductTable = ({ products }) => {
  // Calculate the total price of the products
  const totalPrice = products.reduce((total, product) => total + product.price, 0);

  return (
    <div>
      <h2>Product List</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Image</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.name}</td>
              <td>
                <img src={product.image} alt={product.name} style={{ width: '100px', height: 'auto' }} />
              </td>
              <td>${product.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Total Price: ${totalPrice.toFixed(2)}</h2>
    </div>
  );
};

export default ProductTable;
