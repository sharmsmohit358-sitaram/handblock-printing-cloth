import ProductForm, { emptyPF } from "@/components/ProductForm";
export default function NewProduct() { return (<div><h1 className="text-3xl font-bold">New product</h1><div className="mt-4"><ProductForm initial={emptyPF} isNew /></div></div>); }
