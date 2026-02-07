"use client";

import { Suspense } from "react";
import StepNavigation from "./_components/StepNavigation";

export default function NewBookLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="max-w-4xl mx-auto bg-white flex flex-col">
			<Suspense
				fallback={<div className="px-6 py-5 border-b border-neutral-100" />}
			>
				<StepNavigation />
			</Suspense>
			{children}
		</div>
	);
}
