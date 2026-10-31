import { tr } from '../../translation/tr';

const ERRORS: Record<string, string> = {
  not_member: 'You are not a member of this table.',
  seat_taken: 'Someone took that seat first.',
  already_seated: 'You are already sitting at a table. Leave it first.',
  invalid_seat: 'That seat does not exist.',
  invalid_buy_in: 'That amount of chips is not allowed at this table.',
  not_enough_credits: 'You do not have enough coins for that.',
  not_seated: 'You are not sitting at this table.',
  invalid_amount: 'That amount is not allowed.',
  not_away: 'You are not away.',
  stale_action: 'The hand moved on before your move arrived.',
  not_your_turn: 'It is not your turn.',
  invalid_action: 'That move is not allowed right now.',
  not_friend: 'You can only invite your friends.',
  already_member: 'That person is already at this table.',
  not_owner: 'Only the creator of the table can do that.',
  not_found: 'This table or link does not exist anymore.',
  owner_must_close: 'The creator has to close the table instead of leaving it.',
  at_table: 'You can not do that while sitting at a table.',
  invalid_name: 'Choose a name for the table.',
  invalid_blinds: 'Those blinds are not allowed.',
  already_practicing: 'You already have a practice table.',
  network: 'Could not reach the server. Check your connection.',
};

export const errorText = (code: string): string => {
  const en = ERRORS[code];
  return en === undefined
    ? tr('games.error.unknown', 'Something went wrong. Try again.')
    : tr(`games.error.${code}`, en);
};
