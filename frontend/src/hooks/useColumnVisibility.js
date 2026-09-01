import { useState, useCallback } from 'react';

export default function useColumnVisibility({
  storageKey,
  allColumns = [],
  defaultVisible = null,
}) {
  const initial = useCallback(() => {
    let saved = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      saved = null;
    }

    const map = {};
    allColumns.forEach(({ key }) => {
      if (saved && typeof saved[key] === 'boolean') {
        map[key] = saved[key];
      } else if (defaultVisible && typeof defaultVisible[key] === 'boolean') {
        map[key] = defaultVisible[key];
      } else {
        map[key] = true;
      }
    });
    return map;
  }, [storageKey, allColumns, defaultVisible]);

  const [visible, setVisible] = useState(initial);

  const toggleColumn = useCallback(
    (key) => {
      setVisible((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          /* ignore storage errors */
        }
        return next;
      });
    },
    [storageKey]
  );

  const setAll = useCallback(
    (value) => {
      setVisible((prev) => {
        const next = {};
        allColumns.forEach(({ key }) => {
          next[key] = value;
        });
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          /* ignore storage errors */
        }
        return next;
      });
    },
    [storageKey, allColumns]
  );

  const isVisible = useCallback((key) => !!visible[key], [visible]);

  return { visible, isVisible, toggleColumn, setAll };
}
