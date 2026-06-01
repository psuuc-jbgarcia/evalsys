export interface StructuredMember {
  lastName: string;
  firstName: string;
  middleName?: string;
}

export type Member = string | StructuredMember;

export const formatMemberName = (member: Member) => {
  if (typeof member === 'string') return member;
  return [member.firstName, member.middleName, member.lastName]
    .filter(Boolean)
    .join(' ');
};

export const formatMemberList = (members: Member[] = [], separator = ', ') => (
  members.map(formatMemberName).filter(Boolean).join(separator)
);

export const memberSearchText = (member: Member) => {
  if (typeof member === 'string') return member.toLowerCase();
  return [member.lastName, member.firstName, member.middleName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};
