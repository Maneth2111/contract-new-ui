import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";

interface PaginationBarProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function PaginationBar({ currentPage, totalPages, onPageChange }: PaginationBarProps) {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i +1);
        }
        pages.push(1);
        if (currentPage > 3) pages.push('ellipsis');
        for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 4) pages.push('ellipsis');
        pages.push(totalPages);
        return pages;
    };

    return (
        <>
            <div >
                <Pagination>
                    <PaginationContent className="gap-1">
                        <PaginationItem className="p-4 rounded-md ">
                            <PaginationPrevious
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="disabled:opacity-50 disabled:cursor-not-allowed p-3 cursor-pointer"
                            />
                        </PaginationItem>

                        {getPages().map((page, idx) =>
                            page === 'ellipsis' ? (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={page}>
                                    <PaginationLink className="px-3 py-1 rounded-lg cursor-pointer"
                                        isActive={page === currentPage}
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        )}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="disabled:opacity-50 disabled:cursor-not-allowed p-3 cursor-pointer"
                            />
                        </PaginationItem>

                    </PaginationContent>
                </Pagination>
            </div>
        </>

    );
}