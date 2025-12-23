import { PayBreakdownViewModel, Segment } from "@/domain";

export type PaySectionConfig = {
    label: string;
    selector: (vm: PayBreakdownViewModel) => Segment;
};

export const BASE_SECTION_CONFIG: PaySectionConfig[] = [
    { label: "100%", selector: (vm) => vm.regular.hours100 },
    { label: "שבת תוספת 100%", selector: (vm) => vm.extra100Shabbat },
    { label: "מחלה", selector: (vm) => vm.hours100Sick },
    { label: "חופש", selector: (vm) => vm.hours100Vacation },
];

export const EXTRA_SECTION_CONFIG: PaySectionConfig[] = [
    { label: "תוספת לילה (50%)", selector: (vm) => vm.extra.hours50 },
    { label: "150%", selector: (vm) => vm.regular.hours150 },
    { label: "125%", selector: (vm) => vm.regular.hours125 },
    { label: "שבת 150%", selector: (vm) => vm.special.shabbat150 },
    { label: "שבת 200%", selector: (vm) => vm.special.shabbat200 },
    { label: "תוספת ערב (20%)", selector: (vm) => vm.extra.hours20 },
];