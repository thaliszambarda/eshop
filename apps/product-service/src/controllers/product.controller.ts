import { imagekit } from "@packages/libs/imagekit";
import prisma from "@packages/libs/prisma";
import { AuthError, NotFoundError, ValidationError } from "@packages/middlewares/error-handler";
import type { NextFunction, Request, Response } from "express";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.site_config.findFirst();

    if (!config) {
      return res.status(404).json({ message: "Categories not found" })
    }
  } catch (error) {
    return next(error);
  }
}

export const createDiscountCodes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { public_name, discountType, discountValue, discountCode } = req.body;

    const isDiscountCodeExist = await prisma.discount_codes.findUnique({
      where: {
        discountCode
      }
    })

    if (isDiscountCodeExist) {
      return next(new ValidationError("Discount code already exist, please use a different code!"));
    }

    const discount_code = await prisma.discount_codes.create({
      data: {
        public_name,
        discountType,
        discountValue: parseFloat(discountValue),
        discountCode,
        sellerId: req.seller.id
      }
    })

    res.status(201).json({ success: true, discount_code })
  } catch (error) {
    return next(error);
  }
}

export const getDiscountCodes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const discount_codes = await prisma.discount_codes.findMany({
      where: {
        sellerId: req.seller.id
      }
    })

    res.status(200).json({ success: true, discount_codes })
  } catch (error) {
    return next(error);
  }
}

export const deleteDiscountCode = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller?.id;

    const discountCode = await prisma.discount_codes.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        sellerId: true
      }
    });

    if (!discountCode) {
      return next(new NotFoundError("Discount code not found!"));
    }

    if (discountCode.sellerId !== sellerId) {
      return next(new ValidationError("You are not authorized to delete this discount code!"));
    }

    await prisma.discount_codes.delete({
      where: {
        id
      }
    });

    res.status(200).json({ message: "Discount code deleted successfully!" })
  } catch (error) {
    next(error);
  }
}

export const uploadProductImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName } = req.body;

    const response = await imagekit.upload({
      file: Buffer.from(fileName, 'base64'),
      fileName: `product-${Date.now()}.jpg`,
      folder: '/products'
    })
    res.status(200).json({ file_url: response.url, file_name: response.fileId });
  } catch (error) {
    return next(error);
  }
}

export const deleteProductImage = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;

    const response = await imagekit.deleteFile(fileId);

    return res.status(200).json({
      message: 'Image deleted successfully',
      response,
    });
  } catch (error) {
    return next(error);
  }
};

export const createProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { title, short_description, detailed_description, warranty, custom_specification, slug, tags, cash_on_delivery, brand, video_url, category, colors = [], sizes = [], discountCodes, stock, sale_price, regular_price, subCategory, customProperties = {}, images = [] } = req.body

    if (!title ||
      !slug ||
      !short_description ||
      !tags ||
      !category ||
      !stock ||
      !images ||
      !sale_price ||
      !regular_price ||
      !subCategory) {
      return next(new ValidationError("Missing required fields!"));
    }

    if (!req.seller.id) {
      return next(new AuthError("Only seller can create products!"));
    }

    const slugChecking = await prisma.products.findUnique({
      where: {
        slug,
      },
    });

    if (slugChecking) {
      return next(new ValidationError("Slug already exist! Please use a different slug!"));
    }

    const newProduct = await prisma.products.create({
      data: {
        title,
        short_description,
        detailed_description,
        warranty,
        custom_specification: custom_specification || {},
        slug,
        shopId: req.seller?.shop?.id!,
        tags: Array.isArray(tags) ? tags : tags.split(","),
        cashOnDelevery: cash_on_delivery,
        brand,
        video_url,
        category,
        colors: colors || [],
        sizes: sizes || [],
        discount_codes: discountCodes.map((codeId: string) => codeId),
        stock: parseInt(stock),
        sale_price,
        regular_price,
        subCategory,
        custom_properties: customProperties || {},
        images: {
          create: images.filter((img: any) => img && img.fileId && img.file_url).map((image: any) => ({
            file_id: image.fileId,
            url: image.file_url
          })),
        }
      },
      include: {
        images: true
      }
    });

    res.status(201).json({ success: true, newProduct });
  } catch (error) {
    next(error);
  }
}

export const getShopProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.products.findMany({
      where: {
        shopId: req?.seller?.shop?.id
      },
      include: {
        images: true
      }
    })

    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
}

export const deleteProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const sellerId = req.seller?.shop?.id;

    const product = await prisma.products.findUnique({
      where: {
        id: productId
      },
      select: {
        id: true,
        shopId: true,
        isDeleted: true
      }
    });

    if (!product) {
      return next(new ValidationError("Product not found!"));
    }

    if (product.shopId !== sellerId) {
      return next(new ValidationError("You are not authorized to delete this product!"));
    }

    if (product.isDeleted) {
      return next(new ValidationError("Product already deleted!"));
    }

    const deletedProduct = await prisma.products.update({
      where: {
        id: productId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      },
    });

    res.status(200).json({
      message: "Product is scheduled for deletion in 24 hours. You can undo restore it within this time.",
      deletedAt: deletedProduct.deletedAt
    })
  } catch (error) {
    next(error);
  }
}

export const restoreProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    const sellerId = req.seller?.shop?.id;

    const product = await prisma.products.findUnique({
      where: {
        id: productId
      },
      select: {
        id: true,
        shopId: true,
        isDeleted: true
      }
    });

    if (!product) {
      return next(new ValidationError("Product not found!"));
    }

    if (product.shopId !== sellerId) {
      return next(new ValidationError("You are not authorized to restore this product!"));
    }

    if (!product.isDeleted) {
      return res.status(400).json({ message: "Product is not in deleted state!" });
    }

    await prisma.products.update({
      where: {
        id: productId
      },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    res.status(200).json({
      message: "Product is restored successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Error restoring product!" });
  }
}
