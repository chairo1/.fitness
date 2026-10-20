import { api, errorMessage } from '@/api/client';
import type { Program } from '@/api/types';
import { confirm } from '@/components/ui';
import { bumpData } from '@/store/data';
import { notify } from '@/store/toast';

export const activateProgram = async (p: Program) => {
  try {
    await api.activateProgram(p.id);
    notify(`"${p.name}" aktiv proqram oldu`);
    bumpData();
  } catch (e) {
    notify(errorMessage(e), 'error');
  }
};

export const deleteProgram = (p: Program, after?: () => void) =>
  confirm('Proqramı sil', `"${p.name}" silinsin? Qeyd olunmuş məşqlər qalacaq.`, 'Sil', async () => {
    try {
      await api.deleteProgram(p.id);
      notify('Proqram silindi');
      bumpData();
      after?.();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  });
