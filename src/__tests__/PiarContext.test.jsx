import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PiarProvider, usePiar } from '../context/PiarContext';
import { AuthProvider } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    profile: { full_name: 'Test User' },
    isSuperAdmin: false
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock Supabase
vi.mock('../lib/supabaseClient', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  };
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      channel: vi.fn(() => channelMock),
      removeChannel: vi.fn()
    }
  };
});

function TestComponent() {
  const { piars, activeStudentId, setActiveStudentId, updateLocalPiarData, unsavedChanges, saveActivePiar } = usePiar();
  return (
    <div>
      <div data-testid="piars-count">{piars.length}</div>
      <div data-testid="active-id">{activeStudentId || 'none'}</div>
      <div data-testid="unsaved">{unsavedChanges.toString()}</div>
      <button onClick={() => setActiveStudentId('piar-1')}>Set Active Piar 1</button>
      <button onClick={() => updateLocalPiarData('piar-1', { anexo1: { value: 'test' } })}>Edit Piar 1</button>
      <button onClick={saveActivePiar}>Save Piar 1</button>
    </div>
  );
}

describe('PiarContext Concurrency & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería ignorar la actualización en tiempo real si hay cambios sin guardar', async () => {
    // Setup mock supabase return for loadPiars
    const queryResult = { data: [{ id: 'piar-1', data: {}, owner_id: 'user-123' }], error: null };
    const mockOrder = vi.fn().mockResolvedValue(queryResult);
    const mockSingle = vi.fn().mockResolvedValue({ data: { anexo1: {}, anexo2: {}, anexo3: {} } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEq });
    
    const mockFrom = vi.fn((table) => {
      if (table === 'piars') return { select: mockSelect, update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) };
      if (table === 'profiles') return { select: vi.fn().mockResolvedValue({ data: [] }) };
      if (table === 'piar_edit_logs') return { select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) }), insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    
    // Sobrescribimos el mock por defecto
    supabase.from = mockFrom;

    await act(async () => {
      render(
        <AuthProvider>
          <PiarProvider>
            <TestComponent />
          </PiarProvider>
        </AuthProvider>
      );
    });

    // Validamos carga
    expect(screen.getByTestId('unsaved').textContent).toBe('false');

    // Cambiamos el estado local simulando una edición no guardada
    await act(async () => {
      screen.getByText('Set Active Piar 1').click();
    });
    
    await act(async () => {
      screen.getByText('Edit Piar 1').click();
    });

    expect(screen.getByTestId('unsaved').textContent).toBe('true');

    // Comprobamos que el RPC se llama en el guardado
    supabase.rpc.mockResolvedValueOnce({ error: null });
    await act(async () => {
      screen.getByText('Save Piar 1').click();
    });

    expect(supabase.rpc).toHaveBeenCalledWith('merge_piar_data', expect.objectContaining({
      p_piar_id: 'piar-1'
    }));
  });
});
