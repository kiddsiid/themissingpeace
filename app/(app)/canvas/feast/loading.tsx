export default function FeastLoading() {
  return (
    <div className="-mx-6 -my-6 min-h-screen bg-[#F7F4EE] p-6 md:-mx-10" role="status" aria-label="Loading Feast Studio">
      <div className="mx-auto max-w-[1420px] animate-pulse motion-reduce:animate-none">
        <div className="h-14 rounded-[14px] bg-[#EDE7DD]" />
        <div className="mt-5 grid gap-5 md:grid-cols-[240px_minmax(0,1fr)_320px]">
          <div className="hidden h-[560px] rounded-[16px] bg-[#EDE7DD] md:block" />
          <div className="space-y-4">
            <div className="h-24 rounded-[16px] bg-[#EDE7DD]" />
            <div className="h-56 rounded-[16px] bg-[#EDE7DD]" />
            <div className="h-56 rounded-[16px] bg-[#EDE7DD]" />
          </div>
          <div className="hidden h-[480px] rounded-[16px] bg-[#EDE7DD] xl:block" />
        </div>
      </div>
      <span className="sr-only">Loading the Feast Plan and its deterministic guest-care projection.</span>
    </div>
  );
}
