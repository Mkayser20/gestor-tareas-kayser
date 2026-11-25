import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TaskManagerScreen from '../app/index';
import * as taskService from '../src/services/taskService';
import type { Task } from '../src/types/task';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../src/services/taskService', () => ({
  fetchTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

const mockedTaskService = jest.mocked(taskService);
const initialTasks: Task[] = [
  { id: 't01', title: 'Validar login', description: 'Comprobar campos vacíos y credenciales incorrectas.', priority: 'alta', completed: false },
  { id: 't02', title: 'Corregir navegación', description: 'Validar el regreso desde el detalle.', priority: 'media', completed: true },
  { id: 't03', title: 'Probar API lenta', description: 'Simular una demora y verificar los indicadores de carga.', priority: 'alta', completed: false },
  { id: 't04', title: 'Generar reporte', description: 'Documentar los fallos detectados y su corrección.', priority: 'baja', completed: false },
  { id: 't05', title: 'Revisar validaciones', description: 'Asegurar el tratamiento de espacios y datos vacíos.', priority: 'media', completed: true },
];

describe('TaskManagerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTaskService.fetchTasks.mockImplementation((simulateFailure = false) =>
      simulateFailure
        ? Promise.reject(new Error('HTTP 503: simulado'))
        : Promise.resolve(initialTasks),
    );
    mockedTaskService.createTask.mockResolvedValue({
      id: 't06', title: 'Nueva tarea', description: 'Tarea creada durante el taller de debugging.',
      priority: 'media', completed: false,
    });
    mockedTaskService.updateTask.mockImplementation(async (id, input) => {
      const task = initialTasks.find((record) => record.id === id);
      if (!task) throw new Error('Tarea de prueba inexistente.');
      return { ...task, completed: input.completed };
    });
    mockedTaskService.deleteTask.mockResolvedValue(undefined);
  });

  it('actualiza los contadores al marcar una tarea como completada', async () => {
    render(<TaskManagerScreen />);
    const toggle = await screen.findByTestId('toggle-t01', {}, { timeout: 3000 });
    expect(screen.getByTestId('completed-count').props.children).toBe(2);

    fireEvent.press(toggle);

    await waitFor(() => {
      expect(screen.getByTestId('completed-count').props.children).toBe(3);
    });
  });

  it('oculta el indicador de carga cuando la API falla', async () => {
    render(<TaskManagerScreen />);
    await screen.findByTestId('toggle-t01', {}, { timeout: 3000 });

    fireEvent.press(screen.getByTestId('simulate-error-button'));

    await screen.findByText('No pudimos cargar las tareas. Probá otra vez.', {}, { timeout: 3000 });
    expect(screen.queryByText('Consultando tareas…')).toBeNull();
  }, 20000);

  it('crea tareas a través del servicio y las agrega a la lista', async () => {
    render(<TaskManagerScreen />);
    await screen.findByTestId('toggle-t01');
    fireEvent.changeText(screen.getByTestId('new-task-input'), 'Nueva tarea');

    fireEvent.press(screen.getByTestId('add-task-button'));

    await screen.findByTestId('toggle-t06');
    expect(mockedTaskService.createTask).toHaveBeenCalledWith({
      title: 'Nueva tarea',
      description: 'Tarea creada durante el taller de debugging.',
      completed: false,
    });
  });

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