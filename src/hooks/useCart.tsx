import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = window.localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const index = newCart.findIndex((prod) => prod.id === productId);
      const responseStock = await api.get(`stock/${productId}`);
      const responseProd = await api.get(`products/${productId}`);

      if (index === -1) {
        if (responseStock.data.amount === 0) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        setCart([...newCart, { ...responseProd.data, amount: 1 }]);
        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...newCart, { ...responseProd.data, amount: 1 }])
        );
      } else {
        if (responseStock.data.amount === newCart[index].amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        newCart[index].amount += 1;
        setCart([...newCart]);
        window.localStorage.setItem("@RocketShoes:cart", JSON.stringify([...newCart]));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((prod) => prod.id !== productId);

      if (productIndex >= 0) {
        updatedCart.splice(productId, 1);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount > 0) {
        const products = [...cart];
        const product = products.find((prod) => prod.id === productId);
        if (product) {
          const responseStock = await api.get(`stock/${productId}`);
          if (amount > (responseStock.data.amount || 0)) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }

          product.amount = amount;
          setCart(products);

          window.localStorage.setItem("@RocketShoes:cart", JSON.stringify([...products]));
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
