import { reactive } from 'vue';

export const itemListContext = reactive({
    itemids: []
});

export function setItemListSequence(ids) {
    itemListContext.itemids = Array.isArray(ids) ? [...ids] : [];
}

export function clearItemListSequence() {
    itemListContext.itemids = [];
}
