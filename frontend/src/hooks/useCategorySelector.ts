// frontend/src/hooks/useCategorySelector.ts
"use client";

import { useCallback, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import type { AsyncOption } from "@/components/ui/AsyncSearchSelect";

export type Category = {
  id: string;
  name: string;
  is_active: boolean;
};

type Params = {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;

  // controlado por el padre
  onSelect: (categoryId: string | null) => void;

  fetchUrl?: string;
  allowReactivatePrompt?: boolean;

  // spinner si tu ModalProvider lo soporta
  isModalActionLoading?: boolean;

  // NUEVO: reactivación real (API) si quieres
  onReactivateConfirm?: (cat: Category) => Promise<void> | void;

  // NUEVO: callback post-creación (para refrescar listas/abrir detalles)
  onAfterCreate?: (newCat: Category) => Promise<void> | void;

  // NUEVO: callback post-reactivación (para refrescar listas)
  onAfterReactivate?: (reactivatedCat: Category) => Promise<void> | void;
};

export function useCategorySelector({
  categories,
  setCategories,
  onSelect,
  fetchUrl = "/categories/?status=all",
  allowReactivatePrompt = true,
  isModalActionLoading = false,
  onReactivateConfirm,
  onAfterCreate,
  onAfterReactivate,
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
      if (!newVal) {
        onSelect(null);
        return;
      }

      const selected = categories.find((c) => c.id === newVal);

      if (allowReactivatePrompt && selected && !selected.is_active) {
        openModal("REACTIVATE_CATEGORY", {
          categoryName: selected.name,
          confirmText: "Reactivar y Usar",
          isSubmitting: isModalActionLoading,

          onConfirm: async () => {
            try {
              // si el padre pasa onReactivateConfirm, aquí se reactiva “de verdad”
              if (onReactivateConfirm) {
                await onReactivateConfirm(selected);
              } else {
                toast.info("Categoría seleccionada para reactivación.");
              }

              if (onAfterReactivate) await onAfterReactivate(selected);

              onSelect(newVal);
              closeModal();
            } catch (err) {
              console.error(err);
              toast.error("No se pudo reactivar la categoría.");
              closeModal();
            }
          },
        });

        return;
      }

      onSelect(newVal);
    },
    [
      allowReactivatePrompt,
      categories,
      closeModal,
      isModalActionLoading,
      onAfterReactivate,
      onReactivateConfirm,
      onSelect,
      openModal,
    ]
  );

  const onCreateOption = useCallback(
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

              setCategories((prev) => {
                const next = [...prev, newCat];
                next.sort((a, b) => a.name.localeCompare(b.name));
                return next;
              });

              toast.success(`Categoría "${newCat.name}" creada`);
              if (onAfterCreate) await onAfterCreate(newCat);

              resolve({ value: newCat.id, label: newCat.name, raw: newCat });
              closeModal();
            } catch (err) {
              console.error("Error creando categoría", err);
              toast.error("Error al crear categoría");
              resolve(null);
              closeModal();
            }
          },

          onClose: () => resolve(null),
        });
      });
    },
    [closeModal, isModalActionLoading, onAfterCreate, openModal, setCategories]
  );

  return { fetchUrl, initialOptions, onChange, onCreateOption };
}
