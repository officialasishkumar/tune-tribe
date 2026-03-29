import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchUsers } from "./SearchUsers";


describe("SearchUsers", () => {
  it("only triggers lookup when the form is submitted", () => {
    const setSearchQuery = vi.fn();
    const onSearch = vi.fn();

    const { rerender } = render(
      <SearchUsers
        searchQuery=""
        setSearchQuery={setSearchQuery}
        searchResult={null}
        hasSearched={false}
        isSearching={false}
        searchError={null}
        requests={[]}
        onSearch={onSearch}
        onAddFriend={vi.fn()}
        onAccept={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter full @username"), {
      target: { value: "bob_smith" },
    });

    expect(setSearchQuery).toHaveBeenCalledWith("bob_smith");
    expect(onSearch).not.toHaveBeenCalled();

    rerender(
      <SearchUsers
        searchQuery="bob_smith"
        setSearchQuery={setSearchQuery}
        searchResult={null}
        hasSearched={false}
        isSearching={false}
        searchError={null}
        requests={[]}
        onSearch={onSearch}
        onAddFriend={vi.fn()}
        onAccept={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
