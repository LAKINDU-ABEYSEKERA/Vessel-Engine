import { CategoryForm } from '../category-form';

export default async function NewSectionPage({
                                                 params,
                                             }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    return <CategoryForm subdomain={subdomain} />;
}