import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatShellScreen } from '../screens/ChatShellScreen';

function renderScreen(ui: React.ReactElement) {
  return render(<SafeAreaProvider>{ui}</SafeAreaProvider>);
}

describe('ChatShellScreen', () => {
  it('opens and closes the left drawer via menu and overlay', () => {
    const screen = renderScreen(<ChatShellScreen />);

    fireEvent.press(screen.getByTestId('menu-toggle'));
    expect(screen.getByTestId('left-drawer')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('left-drawer-overlay'));
    expect(screen.queryByTestId('left-drawer')).not.toBeOnTheScreen();
  });

  it('auto-closes drawer when a conversation is selected', () => {
    const screen = renderScreen(<ChatShellScreen />);

    fireEvent.press(screen.getByTestId('menu-toggle'));
    fireEvent.press(screen.getByTestId('conversation-item-conv_1'));

    expect(screen.queryByTestId('left-drawer')).not.toBeOnTheScreen();
  });

  it('opens side panel, activates an action, and closes via hide-panel', () => {
    const screen = renderScreen(<ChatShellScreen />);

    fireEvent.press(screen.getByTestId('right-rail-toggle'));
    expect(screen.getByTestId('right-panel')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('panel-action-prompts'));
    expect(screen.getByText(/Prompts/i)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('panel-action-hide-panel'));
    expect(screen.queryByTestId('right-panel')).not.toBeOnTheScreen();
  });

  it('uses client-derived side panel action ids/order and translated labels', () => {
    const screen = renderScreen(<ChatShellScreen />);

    fireEvent.press(screen.getByTestId('right-rail-toggle'));

    expect(screen.getByTestId('panel-action-agents')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-prompts')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-chat-assistant-prompt')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-memories')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-files')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-bookmarks')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-mcp-builder')).toBeOnTheScreen();
    expect(screen.getByTestId('panel-action-hide-panel')).toBeOnTheScreen();

    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('panel-action-agents')).toBeLessThan(tree.indexOf('panel-action-prompts'));
    expect(tree.indexOf('panel-action-prompts')).toBeLessThan(
      tree.indexOf('panel-action-chat-assistant-prompt'),
    );
    expect(screen.getByText('Persona Builder')).toBeOnTheScreen();
    expect(screen.getByText('MCP Settings')).toBeOnTheScreen();
  });

  it('renders greeting based on time of day', () => {
    const morning = renderScreen(<ChatShellScreen now={new Date(2026, 2, 13, 9, 0, 0)} />);
    expect(morning.getByTestId('greeting-text')).toHaveTextContent('Good morning, Erin Tomorri');
    morning.unmount();

    const afternoon = renderScreen(<ChatShellScreen now={new Date(2026, 2, 13, 14, 0, 0)} />);
    expect(afternoon.getByTestId('greeting-text')).toHaveTextContent('Good afternoon, Erin Tomorri');
    afternoon.unmount();

    const evening = renderScreen(<ChatShellScreen now={new Date(2026, 2, 13, 20, 0, 0)} />);
    expect(evening.getByTestId('greeting-text')).toHaveTextContent('Good evening, Erin Tomorri');
  });

  it('disables send by default and resets composer on new chat', () => {
    const screen = renderScreen(<ChatShellScreen />);

    const sendButton = screen.getByTestId('composer-send-button');
    expect(sendButton).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('composer-input'), 'hello');
    expect(sendButton).not.toBeDisabled();

    fireEvent.press(screen.getByTestId('new-chat-button'));
    expect(screen.getByTestId('composer-input')).toHaveProp('value', '');
    expect(sendButton).toBeDisabled();
  });

  it('uses client-derived drawer search placeholder copy', () => {
    const screen = renderScreen(<ChatShellScreen />);
    fireEvent.press(screen.getByTestId('menu-toggle'));
    expect(screen.getByPlaceholderText('Search messages')).toBeOnTheScreen();
  });

  it('matches main chat snapshot', () => {
    const tree = renderScreen(<ChatShellScreen />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('matches left drawer open snapshot', () => {
    const tree = renderScreen(<ChatShellScreen initialState={{ navVisible: true }} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('matches right panel open snapshot', () => {
    const tree = renderScreen(<ChatShellScreen initialState={{ sidePanelVisible: true }} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
