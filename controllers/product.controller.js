const Product = require("../models/product");
const {
    validateProduct,
} = require("../validations/product.validation");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const fs = require("node:fs");
const path = require("path");
//const { uploadFile } = require('./google.upload');
const Favourite = require("../models/favourite");


// upload new product
exports.createProduct = catchAsync(async(req, res, next) => {
    // validate request
    const isValidRequest = await validateProduct(req.body);
    if (!isValidRequest) {
        return next(
            new AppError(
                "All fields required",
                400
            )
        )
    }
     
    // check if product already exists in db
    const { title } = req.body;
    const isCreatedAlready = await Product.findOne({ title });
    if (isCreatedAlready) {
        res.status(400).json({
            message: "Product with this title already exists"
        })
    }

    try {
        // upload file to google drive
        //await uploadFile(req.file);

        // save new product req to db
        const newProduct = await Product.create({
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            productImage: {
                storagePath: path.join('public', "/uploads/productImages/" + req.file.filename),
                data: fs.readFileSync(path.join('public', "/uploads/productImages/" + req.file.filename)),
                contentType: req.file.mimetype,
            }
        })
         
        res.status(201).json({
            message: "Product created successfully",
            imagePath: newProduct.productImage.storagePath,
            productImageType: newProduct.productImage.contentType,
            imageName: "picture",
            id: newProduct._id,
        })
    } catch (error) {
        res.status(500).json({
            messaage: "Internal server error, could not create product",
            error: error
        })
    }
})


// fetch all products
exports.fetchAllProducts = catchAsync(async(req, res) => {
    let filter = {};
    if (req.query) filter = req.query;
    const products = await Product.find(filter);
    res.status(200).json({
        status: 'success',
        message: 'Products fetched successfully',
    });
})


// fetch single product
exports.fetchProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ _id: req.params.id });
    if (!product)
        return next(
            new AppError('Product not found or does not exist', 404)
        );
    res.status(200).json({
        status: 'success',
        message: 'Product fetched successfully',
        product: product.title
    });
});


// edit product
exports.editProduct = catchAsync(async (req, res) => {
    const id = req.params.id;
    const oldProduct = await Product.findOne({ _id: id })
    
    try {
        let newProduct = await {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price
        }
    
        if (req.file) {
            // delete old image
            const imagePath =  oldProduct.productImage.storagePath;
            fs.unlinkSync(path.join(imagePath));
             
            newProduct.productImage = {
                storagePath: path.join('public', "/uploads/productImages/" + req.file.filename),
                data: fs.readFileSync(path.join('public', "/uploads/productImages/" + req.file.filename)),
                contentType: req.file.mimetype
            }
        }
    
        let update = await Product.findOneAndUpdate({ _id: id }, newProduct, { new: true });

        res.status(200).json({
            message: "Product updated successfuly",
            update: update.productImage.storagePath
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
})

// delete product
exports.deleteProduct = catchAsync(async(req, res) => {
    try {
        // delete product image from server
        const product = await Product.findOne({ _id: req.params.id })
        const imagePath =  product.productImage.storagePath;
        fs.unlinkSync(path.join(imagePath));
         
        // delete from db
        const deleted = await Product.deleteOne({ _id: req.params.id })
        if (!deleted) res.status(400).json({
            message: "Failed to delete product"
        })

        res.status(200).json({
            message: "Product deleted successfully",
            deleted,
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error,
        })
    }
});

exports.addFavourite = catchAsync(async(req, res) => {
    const product = await Product.findOne({ _id: req.params.productId});
    if (!product)
        return next(
            new AppError('Product not found or does not exist', 404)
        );
    const favourite = await Favourite.create({
        user: req.user._id,
        product: product._id,
    });
    res.status(200).json({
        status: 'success',
        message: 'Favourite saved successfully',
        favourite,
    });
});

exports.fetchFavourites = catchAsync(async (req, res, next) => {
    try {
        const filter = { user: req.user._id }
         
        const favourites = await Favourite.find(filter);
        res.status(200).json({
            status: 'success',
            message: 'Favourites fetched successfully',
            favourites,
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error,
        })
    }
});

exports.removeFavourite = catchAsync(async (req, res, next) => {
    try {
        const removed = await Favourite.deleteOne({ _id: req.params.favouriteId });
        if (!removed) res.status(400).json({
            message: "Failed to remove favourite"
        })

        res.status(200).json({
            message: "Favourite removed successfully",
            removed,
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error,
        })
    }
})