import DebugHidePolicy, { debugHidePolicyFromSpec } from './DebugHidePolicy';

describe('DebugHidePolicy', () => {
  const ids = ['first', 'second', 'third'];
  const joinOrder = () => ids;

  it('Hides the subject from the viewer only', () => {
    const policy = new DebugHidePolicy(1, 3, joinOrder);
    expect(policy.canSee('third', 'first')).toBe(false);
    expect(policy.canSee('second', 'first')).toBe(true);
    expect(policy.canSee('third', 'second')).toBe(true);
    expect(policy.canSee('first', 'third')).toBe(true);
  });
  it('Hides nobody while fewer players than the viewer index have joined', () => {
    const policy = new DebugHidePolicy(1, 3, () => ['first', 'second']);
    expect(policy.canSee('second', 'first')).toBe(true);
  });
  describe('debugHidePolicyFromSpec', () => {
    it('Builds a policy from "subject:viewer"', () => {
      const policy = debugHidePolicyFromSpec(' 1:3 ', joinOrder);
      expect(policy?.canSee('third', 'first')).toBe(false);
    });
    it.each([undefined, '', 'abc', '1', '1:1', '0:2', '1:3:4', '-1:2'])(
      'Returns undefined for the spec %p',
      spec => {
        expect(debugHidePolicyFromSpec(spec, joinOrder)).toBeUndefined();
      },
    );
  });
});
