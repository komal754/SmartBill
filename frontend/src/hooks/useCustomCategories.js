import { useState, useEffect } from 'react';

// key: string (e.g. 'expenseCategories' or 'paymentCategories')
export function useCustomCategories(key, defaultCategories) {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return [...defaultCategories, ...arr.filter(cat => !defaultCategories.includes(cat))];
      } catch {}
    }
    return [...defaultCategories];
  });

  // Add a new category (if not duplicate)
  function addCategory(newCat) {
    if (!newCat || typeof newCat !== 'string' || newCat.trim() === '') return false;
    newCat = newCat.trim();
    if (categories.includes(newCat)) return false;
    const updated = [...categories, newCat];
    setCategories(updated);
    // Only store custom (non-default) categories
    const custom = updated.filter(cat => !defaultCategories.includes(cat));
    localStorage.setItem(key, JSON.stringify(custom));
    return true;
  }

  // Optionally: remove a custom category
  function removeCategory(cat) {
    if (!cat || defaultCategories.includes(cat)) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    const custom = updated.filter(c => !defaultCategories.includes(c));
    localStorage.setItem(key, JSON.stringify(custom));
  }

  // Sync with localStorage changes (e.g. from another tab)
  useEffect(() => {
    function sync() {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) {
            setCategories([...defaultCategories, ...arr.filter(cat => !defaultCategories.includes(cat))]);
          }
        } catch {}
      }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, defaultCategories]);

  return [categories, addCategory, removeCategory];
}
