import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

describe('Mentor paywall copy contract', () => {
    const source = fs.readFileSync(path.join(ROOT_DIR, 'js', 'mentor.js'), 'utf8');

    test('limit teaser shows a concrete paid preview with one upgrade CTA and a free escape', () => {
        expect(source).toContain("buildMentorUpgradeUrl('mentor_teaser_gate')");
        expect(source).toContain("startMentorUpgradeFlow('mentor_teaser_gate')");
        expect(source).toContain('Odemknout vedení');
        expect(source).toContain('Zůstat u dnešního chatu');
        expect(source).toContain('jeden konkrétní další krok');
        expect(source).toContain('feature: \'mentor\'');
        expect(source).toContain('MENTOR_PAYMENT_REASSURANCE');
        expect(source).toContain('mentor-paywall__reassurance');
    });

    test('backend paywall overlay can be dismissed without starting checkout', () => {
        expect(source).toContain("buildMentorUpgradeUrl('mentor_paywall_overlay')");
        expect(source).toContain("keepMentorFree('mentor_paywall_overlay', overlay)");
        expect(source).toContain('paywall_dismissed');
        expect(source).toContain('Denní limit zdarma je vyčerpaný');
    });
});
