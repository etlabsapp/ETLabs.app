import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/HomeClient"), {
  ssr: false,
  loading: () => <div className="introChecking" aria-hidden="true" />,
});

export default function HomePage() {
  return <HomeClient />;
}
