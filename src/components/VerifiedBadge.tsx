import React from "react";

/** [PHASE-3] علامة التوثيق الزرقاء بجانب اسم المستخدم الموثّق الهوية. */
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block align-middle shrink-0 mr-1" role="img" aria-label="حساب موثّق">
      <title>حساب موثّق</title>
      <path fill="#1d9bf0" d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1z" />
      <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M7.8 12.4l3 3 5.6-6" />
    </svg>
  );
}
