"use client";

type Props = {
  formId: string;
};

function setChecked(formId: string, checked: boolean) {
  const selector = `input[type="checkbox"][name="ids"][form="${formId}"]`;
  const elements = document.querySelectorAll<HTMLInputElement>(selector);
  elements.forEach((element) => {
    element.checked = checked;
  });
}

export function BulkSelectControls({ formId }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setChecked(formId, true)}
        className="admin-btn admin-btn-ghost admin-btn-sm"
      >
        Pilih Semua
      </button>
      <button
        type="button"
        onClick={() => setChecked(formId, false)}
        className="admin-btn admin-btn-ghost admin-btn-sm"
      >
        Bersihkan
      </button>
    </div>
  );
}
