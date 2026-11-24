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
});