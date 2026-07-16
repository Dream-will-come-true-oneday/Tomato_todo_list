import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App todo creation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('selects a newly created todo so it can be edited and timed immediately', () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('新增待办'), {
      target: { value: '复盘产品体验' }
    });
    fireEvent.click(screen.getByLabelText('新增待办'));

    expect((screen.getByLabelText('标题') as HTMLInputElement).value).toBe('复盘产品体验');
    expect(screen.getAllByText('复盘产品体验').length).toBeGreaterThanOrEqual(2);
  });
});
