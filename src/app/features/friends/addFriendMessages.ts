import { FriendsApiError } from './friendsApi';
import { tr } from '../translation/tr';

export const sendSuccessMessage = (result: 'pending' | 'accepted', userId: string): string =>
  result === 'pending'
    ? tr('friends.request_sent_to', 'Request sent to {{userId}}', { userId })
    : tr('friends.now_friends_with', "You're now friends with {{userId}}", { userId });

export const sendErrorMessage = (error: unknown, userId: string): string => {
  const code = error instanceof FriendsApiError ? error.code : undefined;
  switch (code) {
    case 'invalid_user_id':
      return tr('friends.error.invalid_user_id', "That's not a valid username");
    case 'self':
      return tr('friends.error.self', "That's you");
    case 'other_server':
      return tr('friends.error.other_server', 'Only blazeroom.com.br users can be added');
    case 'no_such_user':
      return tr('friends.error.no_such_user', 'No user named {{userId}}', { userId });
    case 'already_friends':
      return tr('friends.error.already_friends', "You're already friends");
    case 'already_requested':
      return tr('friends.error.already_requested', 'Request already sent');
    default:
      return tr('friends.error.send_failed', "Couldn't send the request, try again");
  }
};
