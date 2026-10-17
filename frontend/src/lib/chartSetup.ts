import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Estilos globales de Chart.js idénticos al original
ChartJS.defaults.font.family = "'Inter', -apple-system, Roboto, sans-serif";
ChartJS.defaults.font.size = 11.5;
ChartJS.defaults.color = '#3d4a55';
