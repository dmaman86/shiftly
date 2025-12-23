import { useCallback, useState } from "react";


export const useList = <T extends { id: string }>() => {
    const [items, setItems] = useState<T[]>([]);

    const addItem = useCallback((item: T) => {
        setItems(prev => [...prev, item]);
    }, []);

    const updateItem = useCallback((id: string, updated: T) => {
        setItems(prev => prev.map((item) => item.id === id ? updated : item));
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter((item) => item.id !== id));
    }, []);

    const replaceAll = useCallback((items: T[]) => {
        setItems(items);
    }, []);

    const clear = useCallback(() => {
        setItems([]);
    }, []);

    return {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        replaceAll,
        clear,
    }
}