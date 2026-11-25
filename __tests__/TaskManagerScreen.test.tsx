import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskManagerScreen from '../app/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('TaskManagerScreen', () => {
  it('actualiza los contadores al marcar una tarea como completada', async () => {
    render(<TaskManagerScreen />);
    const toggle = await screen.findByTestId('toggle-t01', {}, { timeout: 3000 });
    expect(screen.getByTestId('completed-count').props.children).toBe(2);

    fireEvent.press(toggle);

    expect(screen.getByTestId('completed-count').props.children).toBe(3);
  });

    it('oculta el indicador de carga cuando la API falla', async () => {
    render(<TaskManagerScreen />);
    await screen.findByTestId('toggle-t01', {}, { timeout: 3000 });

    fireEvent.press(screen.getByTestId('simulate-error-button'));

    await screen.findByText('No pudimos cargar las tareas. Probá otra vez.', {}, { timeout: 3000 });
    expect(screen.queryByText('Consultando tareas…')).toBeNull();
  }, 20000);

    it('no arrastra la tarjeta expandida a otra tarea al cambiar de filtro', async () => {
    render(<TaskManagerScreen />);
    await screen.findByTestId('expand-t01', {}, { timeout: 3000 });

    fireEvent.press(screen.getByTestId('expand-t01'));
    expect(screen.getByTestId('details-t01')).toBeTruthy();

    fireEvent.press(screen.getByText('Completadas'));

    expect(screen.queryByTestId('details-t02')).toBeNull();
    expect(screen.queryByTestId('details-t05')).toBeNull();
  }, 20000);
});