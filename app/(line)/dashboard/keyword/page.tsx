import FormKeyword from "@/app/components/formKeyword";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Keyword Management</h1>
      <p className="font-light text-gray-400 text-md">
        Here you can manage your keywords for the LineMe dashboard.
      </p>
      <div className="mt-6">
        <FormKeyword />
      </div>
    </div>
  );
}
