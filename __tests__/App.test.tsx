import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock the GameCanvas component to avoid canvas/engine complexity in this high-level test
jest.mock('@/components/Game/GameCanvas', () => {
  return function DummyGameCanvas() {
    return <div data-testid="game-canvas">Game Canvas</div>;
  };
});

describe('App Entry Point', () => {
  it('renders the main page without crashing', () => {
    render(<Home />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });
});
