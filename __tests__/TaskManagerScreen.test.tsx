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
});