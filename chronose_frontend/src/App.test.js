import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Chronose Frontend text', () => {
  render(<App />);
  const element = screen.getByText(/Chronose Frontend/i);
  expect(element).toBeInTheDocument();
});
