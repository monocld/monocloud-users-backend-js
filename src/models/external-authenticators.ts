/**
 *
 * @export
 * @enum {string}
 */

export const ExternalAuthenticators = {
  /**
   *
   */
  Google: 'google',
  /**
   *
   */
  Apple: 'apple',
  /**
   *
   */
  Facebook: 'facebook',
  /**
   *
   */
  Microsoft: 'microsoft',
  /**
   *
   */
  Github: 'github',
  /**
   *
   */
  Gitlab: 'gitlab',
  /**
   *
   */
  Discord: 'discord',
  /**
   *
   */
  Twitter: 'twitter',
  /**
   *
   */
  Linkedin: 'linkedin',
  /**
   *
   */
  Xero: 'xero',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ExternalAuthenticators =
  (typeof ExternalAuthenticators)[keyof typeof ExternalAuthenticators];
