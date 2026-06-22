const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, discount } = req.body;
    let imageUrl = '';
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME === 'dummy' || !process.env.CLOUDINARY_CLOUD_NAME) {
        // Fallback for sandboxed developer mode with dummy credentials
        imageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
      } else {
        try {
          const result = await cloudinary.uploader.upload(req.file.path);
          imageUrl = result.secure_url;
        } catch (uploadError) {
          console.warn('Cloudinary upload failed, falling back to mock image:', uploadError.message);
          imageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
        }
      }
    }
    const product = new Product({
      name, description, price, category, stock, imageUrl, discount: discount || 0
    });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, discount } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
      product.name = name || product.name;
      product.description = description || product.description;
      product.price = price || product.price;
      product.category = category || product.category;
      product.stock = stock || product.stock;
      product.discount = discount !== undefined ? discount : product.discount;

      if (req.file) {
        if (process.env.CLOUDINARY_CLOUD_NAME === 'dummy' || !process.env.CLOUDINARY_CLOUD_NAME) {
          // Fallback for sandboxed developer mode with dummy credentials
          product.imageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
        } else {
          try {
            const result = await cloudinary.uploader.upload(req.file.path);
            product.imageUrl = result.secure_url;
          } catch (uploadError) {
            console.warn('Cloudinary upload failed, falling back to mock image:', uploadError.message);
            product.imageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
          }
        }
      }
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
