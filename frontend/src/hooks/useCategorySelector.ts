// frontend/src/hooks/useCategorySelector.ts
"use client";

import { useCallback, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import type { AsyncOption } from "@/components/ui/AsyncSearchSelect";

export type Category = { id: string; name: string; is_active: boolean };

type Params = {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;

  // valor seleccionado lo maneja el padre (tu row)
  onSelect: (categoryId: string | null) => void;

  // config
  fetchUrl?: string; // default: "/categories/?status=all"
  allowReactivatePrompt?: boolean; // default: true (como Gastos)

  // si quieres que Ingresos “difera” la creación, sobreescribe esto
  onCreateOptionOverride?: (label: string) => Promise<AsyncOption | null>;
  isModalActionLoading?: boolean; // si tu ModalProvider lo usa
};

export function useCategorySelector({
  categories,
  setCategories,
  onSelect,
  fetchUrl = "/categories/?status=all",
  allowReactivatePrompt = true,
  onCreateOptionOverride,
  isModalActionLoading = false,
}: Params) {
  const { openModal, closeModal } = useModal();

  const initialOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: c.is_active ? c.name : `⚠️ ${c.name} (Inactiva)`,
        raw: c,
      })),
    [categories]
  );

  const onChange = useCallback(
    (newVal: string | null) => {
      if (!newVal) return onSelect(null);

      const selectedCat = categories.find((c) => c.id === newVal);

      if (allowReactivatePrompt && selectedCat && !selectedCat.is_active) {
        openModal("REACTIVATE_CATEGORY", {
          categoryName: selectedCat.name,
          confirmText: "Reactivar y Usar",
          onConfirm: () => {
            onSelect(newVal);
            toast.info("Categoría seleccionada para reactivación.");
            closeModal();
          },
        });
        return;
      }

      onSelect(newVal);
    },
    [allowReactivatePrompt, categories, onSelect, openModal, closeModal]
  );

  const onCreateOptionDefault = useCallback(
    (inputValue: string): Promise<AsyncOption | null> => {
      return new Promise((resolve) => {
        openModal("CREATE_CATEGORY_PRIVATE", {
          name: inputValue,
          confirmText: "Sí, crear categoría privada",
          isSubmitting: isModalActionLoading,

          onConfirm: async () => {
            try {
              const res = await api.post<Category>("/categories/", {
                name: inputValue,
                is_active: true,
              });

              const newCat = res.data;
              setCategories((prev) => [...prev, newCat]);

              toast.success(`Categoría privada "${newCat.name}" creada`);
              resolve({ value: newCat.id, label: newCat.name, raw: newCat });
              closeModal();
            } catch (e) {
              toast.error("Error al crear categoría");
              resolve(null);
              closeModal();
            }
          },

          onClose: () => resolve(null),
        });
      });
    },
    [openModal, closeModal, isModalActionLoading, setCategories]
  );

  return {
    fetchUrl,
    initialOptions,
    onChange,
    onCreateOption: onCreateOptionOverride ?? onCreateOptionDefault,
  };
}
